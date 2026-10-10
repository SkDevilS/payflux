import os
import re

def patch_moneyone_service():
    file_path = 'moneyone_service.py'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # We need to add the payout methods to MoneyoneService class.
    # We will append them right before the `moneyone_service = MoneyoneService()` instantiation.

    payout_methods = """
    def generate_payout_txn_id(self, merchant_id, reference_id):
        \"\"\"Generate unique transaction ID with MO_TXN_ prefix\"\"\"
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        import random
        random_suffix = random.randint(1000, 9999)
        return f"MO_TXN_{timestamp}{random_suffix}"

    def initiate_payout(self, merchant_id, payout_data, admin_id=None):
        \"\"\"Initiate payout transaction via MoneyOne\"\"\"
        try:
            conn = get_db_connection()
            if not conn:
                return {'success': False, 'message': 'Database connection failed'}
            
            with conn.cursor() as cursor:
                is_admin_payout = admin_id is not None or (merchant_id and merchant_id.startswith('ADMIN_'))
                
                if is_admin_payout:
                    charge_amount, net_amount, charge_type = 0.00, float(payout_data['amount']), 'FIXED'
                    if merchant_id and merchant_id.startswith('ADMIN_'):
                        admin_id = merchant_id.replace('ADMIN_', '')
                        merchant_id = None
                else:
                    cursor.execute("SELECT scheme_id, is_active FROM merchants WHERE merchant_id = %s", (merchant_id,))
                    merchant = cursor.fetchone()
                    
                    if not merchant:
                        return {'success': False, 'message': 'Merchant not found'}
                    if not merchant['is_active']:
                        return {'success': False, 'message': 'Merchant account is inactive'}
                    
                    charge_amount, net_amount, charge_type = self.calculate_charges(
                        float(payout_data['amount']), merchant['scheme_id'], 'PAYOUT'
                    )
                    
                    if charge_amount is None:
                        return {'success': False, 'message': 'Unable to calculate charges'}
                    
                    total_deduction = float(payout_data['amount']) + float(charge_amount)
                    
                    cursor.execute("SELECT COALESCE(settled_balance, balance, 0) as available_balance FROM merchant_wallet WHERE merchant_id = %s", (merchant_id,))
                    wallet_result = cursor.fetchone()
                    available_balance = float(wallet_result['available_balance']) if wallet_result else 0.00
                    
                    if total_deduction > available_balance:
                        return {
                            'success': False,
                            'message': f'Insufficient balance in wallet, remaining balance: ₹{available_balance:.2f}'
                        }

                # check if existing
                cursor.execute("SELECT txn_id FROM payout_transactions WHERE reference_id = %s AND pg_partner = 'Moneyone'", (payout_data['reference_id'],))
                existing = cursor.fetchone()
                if existing:
                    txn_id = existing['txn_id']
                else:
                    txn_id = self.generate_payout_txn_id(merchant_id, payout_data['reference_id'])
                    
                    # Generate PY order ID
                    import datetime as dt
                    py_order_id = f"PY_{int(dt.datetime.now().timestamp()*1000)}"

                    cursor.execute(\"\"\"
                        INSERT INTO payout_transactions (
                            txn_id, merchant_id, admin_id, reference_id, order_id, amount, charge_amount,
                            charge_type, net_amount, bene_name, bene_email, bene_mobile,
                            bene_bank, ifsc_code, account_no, payment_type, purpose,
                            status, pg_partner, callback_url, remarks, created_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    \"\"\", (
                        txn_id, merchant_id, admin_id, payout_data['reference_id'], py_order_id,
                        payout_data['amount'], charge_amount, charge_type, net_amount,
                        payout_data['bene_name'], payout_data.get('bene_email', ''),
                        payout_data.get('bene_mobile', ''), payout_data.get('bank_name', ''),
                        payout_data['bene_ifsc'], payout_data['bene_account'],
                        payout_data.get('payment_mode', 'IMPS'), payout_data.get('narration', 'Payment'),
                        'INITIATED', 'Moneyone', payout_data.get('callback_url', ''),
                        payout_data.get('remarks', '')
                    ))
                    conn.commit()

                try:
                    headers = self._get_headers()
                except Exception as e:
                    return {'success': False, 'message': str(e)}

                # In case existing transaction had py_order_id set
                cursor.execute("SELECT order_id FROM payout_transactions WHERE txn_id = %s", (txn_id,))
                row = cursor.fetchone()
                py_order_id = row['order_id'] if row and row['order_id'] else payout_data['reference_id']

                base_url = os.getenv('BACKEND_URL', 'https://api.payflux.online')
                callback_url = f"{base_url}/api/callback/moneyone/payout"
                
                payload = {
                    'order_id': py_order_id,
                    'amount': float(payout_data['amount']),
                    'tpin': Config.MONEYONE_TPIN if hasattr(Config, 'MONEYONE_TPIN') else '1234',
                    'account_holder_name': payout_data['bene_name'],
                    'account_number': payout_data['bene_account'],
                    'ifsc_code': payout_data['bene_ifsc'],
                    'bank_name': payout_data.get('bank_name', ''),
                    'payment_type': payout_data.get('payment_mode', 'IMPS'),
                    'purpose': payout_data.get('narration', 'Payment'),
                    'bene_email': payout_data.get('bene_email', ''),
                    'bene_mobile': payout_data.get('bene_mobile', ''),
                    'callback_url': callback_url
                }

                url = f"{self.base_url}/api/payout/client/direct-payout"
                
                response = requests.post(url, headers=headers, json=payload, timeout=30)
                
                if response.status_code not in [200, 201]:
                    error_msg = f'Moneyone API error: HTTP {response.status_code} - {response.text}'
                    cursor.execute("UPDATE payout_transactions SET status = 'FAILED', error_message = %s, updated_at = NOW() WHERE txn_id = %s", (error_msg, txn_id))
                    conn.commit()
                    return {'success': False, 'message': error_msg}
                
                moneyone_response = response.json()
                if not moneyone_response.get('success'):
                    error_msg = moneyone_response.get('message', 'Payout failed')
                    cursor.execute("UPDATE payout_transactions SET status = 'FAILED', error_message = %s, updated_at = NOW() WHERE txn_id = %s", (error_msg, txn_id))
                    conn.commit()
                    return {'success': False, 'message': error_msg}
                
                moneyone_reference_id = moneyone_response.get('reference_id') or py_order_id
                moneyone_txn_id = moneyone_response.get('txn_id')
                status = moneyone_response.get('status', 'PENDING')
                
                status_map = {
                    'SUCCESS': 'SUCCESS', 'PENDING': 'QUEUED', 'FAILED': 'FAILED',
                    'PROCESSING': 'INPROCESS', 'INITIATED': 'QUEUED', 'QUEUED': 'QUEUED'
                }
                mapped_status = status_map.get(status.upper(), 'QUEUED')
                
                cursor.execute(\"\"\"
                    UPDATE payout_transactions
                    SET status = %s, pg_txn_id = %s, updated_at = NOW()
                    WHERE txn_id = %s
                \"\"\", (mapped_status, moneyone_reference_id, txn_id))
                conn.commit()
                
                return {
                    'success': True,
                    'message': 'Payout initiated successfully',
                    'txn_id': txn_id,
                    'reference_id': payout_data['reference_id'],
                    'moneyone_reference_id': moneyone_reference_id,
                    'moneyone_txn_id': moneyone_txn_id,
                    'status': mapped_status,
                    'amount': payout_data['amount'],
                    'charge_amount': charge_amount
                }
                
        except Exception as e:
            print(f"Moneyone payout error: {e}")
            return {'success': False, 'message': f'Internal error: {str(e)}'}
        finally:
            if conn:
                conn.close()

    def check_payout_status(self, transaction_id=None, order_id=None):
        try:
            conn = get_db_connection()
            if not conn:
                return {'success': False, 'message': 'Database connection failed'}
            
            with conn.cursor() as cursor:
                if order_id:
                    cursor.execute("SELECT status, pg_txn_id, bank_ref_no, amount FROM payout_transactions WHERE reference_id = %s AND pg_partner = 'Moneyone'", (order_id,))
                elif transaction_id:
                    cursor.execute("SELECT status, pg_txn_id, bank_ref_no, amount, reference_id FROM payout_transactions WHERE pg_txn_id = %s AND pg_partner = 'Moneyone'", (transaction_id,))
                else:
                    return {'success': False, 'message': 'Either transaction_id or order_id required'}
                
                txn = cursor.fetchone()
                
                if not txn:
                    return {'success': False, 'message': 'Transaction not found'}
                
                return {
                    'success': True,
                    'status': txn['status'],
                    'transaction_id': txn['pg_txn_id'],
                    'order_id': txn.get('reference_id', order_id),
                    'utr': txn['bank_ref_no'],
                    'amount': float(txn['amount']),
                    'message': 'Status retrieved from database'
                }
        except Exception as e:
            return {'success': False, 'message': f'Status check error: {str(e)}'}
        finally:
            if conn:
                conn.close()
"""
    if 'def initiate_payout' not in content:
        content = content.replace("moneyone_service = MoneyoneService()", payout_methods + "\nmoneyone_service = MoneyoneService()")
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Patched moneyone_service.py")

patch_moneyone_service()
