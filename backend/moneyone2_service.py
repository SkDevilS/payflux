"""
MoneyOne 2 Payment Gateway Integration Service
Handles payin transactions through MoneyOne 2
"""

import requests
import json
import base64
import os
from datetime import datetime
from config import Config
from database import get_db_connection
from utils import encrypt_aes, decrypt_aes

class Moneyone2Service:
    def __init__(self):
        self.base_url = Config.MONEYONE2_BASE_URL
        self.merchant_id = Config.MONEYONE2_MERCHANT_ID
        self.password = Config.MONEYONE2_PASSWORD
        self.auth_key = Config.MONEYONE2_AUTH_KEY
        self.module_secret = Config.MONEYONE2_MODULE_SECRET
        self.aes_key = Config.MONEYONE2_AES_KEY
        self.aes_iv = Config.MONEYONE2_AES_IV
        self.token = None
    
    def _generate_token(self):
        """Generate authentication token via login"""
        try:
            url = f"{self.base_url}/api/merchant/login"
            
            payload = {
                'merchantId': self.merchant_id,
                'password': self.password
            }
            
            headers = {
                'Content-Type': 'application/json'
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            
            if response.status_code in [200, 201]:
                data = response.json()
                if data.get('success'):
                    self.token = data.get('token')
                    return {'success': True, 'token': self.token}
                return {'success': False, 'message': data.get('message', 'Login failed')}
            else:
                return {'success': False, 'message': f'Login failed: {response.text}'}
                
        except Exception as e:
            print(f"MoneyOne 2 generate token error: {e}")
            return {'success': False, 'message': f'Token generation error: {str(e)}'}
            
    def _get_headers(self):
        """Get request headers with token and keys"""
        # Calling login API on every request to avoid 'Token has expired' errors
        res = self._generate_token()
        if not res['success']:
            raise Exception("Failed to acquire token: " + res['message'])
                
        return {
            'Authorization': f'Bearer {self.token}',
            'X-Authorization-Key': self.auth_key,
            'X-Module-Secret': self.module_secret,
            'Content-Type': 'application/json'
        }

    def generate_txn_id(self, merchant_id, order_id):
        """Generate unique transaction ID with MO2_ prefix"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        import random
        random_suffix = random.randint(1000, 9999)
        return f"MO2_{timestamp}{random_suffix}"

    def calculate_charges(self, amount, scheme_id, service_type='PAYIN'):
        """Calculate charges based on scheme"""
        try:
            conn = get_db_connection()
            if not conn:
                return None, None, None
            
            with conn.cursor() as cursor:
                # Get applicable charge
                cursor.execute("""
                    SELECT charge_value, charge_type
                    FROM commercial_charges
                    WHERE scheme_id = %s 
                    AND service_type = %s
                    AND %s BETWEEN min_amount AND max_amount
                    ORDER BY min_amount DESC
                    LIMIT 1
                """, (scheme_id, service_type, amount))
                
                charge_config = cursor.fetchone()
                
                if not charge_config:
                    return 0.00, amount, 'FIXED'
                
                charge_type = charge_config['charge_type']
                charge_value = float(charge_config['charge_value'])
                
                if charge_type == 'PERCENTAGE':
                    charge_amount = (amount * charge_value) / 100
                else:  # FIXED
                    charge_amount = charge_value
                
                net_amount = amount - charge_amount
                
                return round(charge_amount, 2), round(net_amount, 2), charge_type
                
        except Exception as e:
            print(f"Calculate charges error: {e}")
            return None, None, None
        finally:
            if conn:
                conn.close()

    def create_payin_order(self, merchant_id, order_data):
        """
        Create payin order via MoneyOne 2
        order_data should contain:
        - amount
        - orderid
        - payee_fname
        - payee_lname
        - payee_mobile
        - payee_email
        """
        try:
            conn = get_db_connection()
            if not conn:
                return {'success': False, 'message': 'Database connection failed'}
            
            with conn.cursor() as cursor:
                # Get merchant details
                cursor.execute("""
                    SELECT merchant_id, full_name, email, scheme_id, is_active
                    FROM merchants
                    WHERE merchant_id = %s
                """, (merchant_id,))
                
                merchant = cursor.fetchone()
                
                if not merchant:
                    return {'success': False, 'message': 'Merchant not found'}
                
                if not merchant['is_active']:
                    return {'success': False, 'message': 'Merchant account is inactive'}
                
                amount = float(order_data.get('amount', 0))
                if amount <= 0:
                    return {'success': False, 'message': 'Invalid amount'}
                
                charge_amount, net_amount, charge_type = self.calculate_charges(
                    amount, merchant['scheme_id']
                )
                
                if charge_amount is None:
                    return {'success': False, 'message': 'Failed to calculate charges'}
                
                # Generate txn ID with prefix 'MO2_'
                original_orderid = order_data.get('orderid')
                txn_id = self.generate_txn_id(merchant_id, original_orderid)
                
                # We need to pass the callback URL required by MoneyOne 2
                callback_url = "https://api.payflux.online/payin/callback/moneyone2"
                
                # Format amount: use int if it's a whole number, else float
                display_amount = int(amount) if float(amount).is_integer() else amount
                
                # Payload construction
                payload_dict = {
                    "amount": display_amount,
                    "orderid": original_orderid,  # Send the exact order id provided by the merchant
                    "payee_fname": order_data.get('payee_fname', 'User'),
                    "payee_lname": order_data.get('payee_lname', ''),
                    "payee_mobile": order_data.get('payee_mobile', ''),
                    "payee_email": order_data.get('payee_email', ''),
                    "callbackurl": callback_url
                }
                
                # Encrypt payload
                json_payload = json.dumps(payload_dict)
                encrypted_payload = encrypt_aes(json_payload, self.aes_key, self.aes_iv)
                
                try:
                    headers = self._get_headers()
                except Exception as e:
                    return {'success': False, 'message': str(e)}
                
                url = f"{self.base_url}/api/payin/order/create"
                
                print(f"Creating MoneyOne 2 order for {txn_id}...")
                
                response = requests.post(
                    url,
                    headers=headers,
                    json={'data': encrypted_payload},
                    timeout=30
                )
                
                if response.status_code == 401:
                    # Token expired, try refreshing
                    self.token = None
                    headers = self._get_headers()
                    response = requests.post(
                        url,
                        headers=headers,
                        json={'data': encrypted_payload},
                        timeout=30
                    )
                
                if response.status_code not in [200, 201]:
                    error_msg = f'MoneyOne 2 API error: {response.status_code} - {response.text}'
                    print(error_msg)
                    return {'success': False, 'message': 'API Error. Check logs.'}
                
                # The response should be a JSON containing an encrypted base64 string in 'data'
                try:
                    response_json = response.json()
                    encrypted_response_data = response_json.get('data')
                    if not encrypted_response_data:
                        return {'success': False, 'message': 'Invalid response format from API'}
                        
                    decrypted_response_text = decrypt_aes(encrypted_response_data, self.aes_key, self.aes_iv)
                    moneyone2_response = json.loads(decrypted_response_text)
                except Exception as e:
                    print(f"Failed to decrypt MoneyOne 2 response: {e}. Raw response: {response.text}")
                    return {'success': False, 'message': 'Failed to decode API response'}
                    
                # MoneyOne 2 might not return a 'success' key, check for txn_id or upi_link
                if not moneyone2_response.get('success', True) and 'txn_id' not in moneyone2_response and 'upi_link' not in moneyone2_response:
                    error_msg = moneyone2_response.get('message', 'Order creation failed')
                    return {'success': False, 'message': error_msg}
                
                # Check for error in response
                if moneyone2_response.get('error') or moneyone2_response.get('status') == False:
                    error_msg = moneyone2_response.get('message', 'Order creation failed')
                    return {'success': False, 'message': error_msg}
                    
                # Extract response data
                primary_link = moneyone2_response.get('payment_link') or moneyone2_response.get('upi_link') or moneyone2_response.get('intent_url') or ''
                
                upi_link = primary_link
                qr_string = primary_link
                payment_link = primary_link
                intent_url = primary_link
                
                # Insert transaction record
                cursor.execute("""
                    INSERT INTO payin_transactions (
                        txn_id, merchant_id, order_id, amount, charge_amount, 
                        charge_type, net_amount, payee_name, payee_email, 
                        payee_mobile, product_info, status, pg_partner,
                        callback_url, created_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                    )
                """, (
                    txn_id, merchant_id, original_orderid, amount, 
                    charge_amount, charge_type, net_amount,
                    f"{payload_dict['payee_fname']} {payload_dict['payee_lname']}".strip(), 
                    payload_dict['payee_email'], payload_dict['payee_mobile'], 
                    order_data.get('productinfo', 'Payment'),
                    'INITIATED', 'MONEYONE2',
                    order_data.get('callbackurl', '')  # Merchant's original callback
                ))
                
                conn.commit()
                
                return {
                    'success': True,
                    'txn_id': txn_id,
                    'order_id': original_orderid,
                    'amount': amount,
                    'charge_amount': charge_amount,
                    'net_amount': net_amount,
                    'qr_string': qr_string,
                    'upi_link': upi_link,
                    'payment_link': payment_link,
                    'intent_url': intent_url
                }
                
        except Exception as e:
            print(f"Create MoneyOne 2 payin order error: {e}")
            return {'success': False, 'message': f'Internal error: {str(e)}'}
        finally:
            if conn:
                conn.close()

    def generate_payout_txn_id(self, merchant_id, reference_id):
        """Generate unique transaction ID with MO2_TXN_ prefix"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        import random
        random_suffix = random.randint(1000, 9999)
        return f"MO2_TXN_{timestamp}{random_suffix}"

    def initiate_payout(self, merchant_id, payout_data, admin_id=None):
        """Initiate payout transaction via MoneyOne 2"""
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
                    

                cursor.execute("SELECT txn_id, order_id FROM payout_transactions WHERE reference_id = %s AND pg_partner = 'MONEYONE2'", (payout_data['reference_id'],))
                existing = cursor.fetchone()
                if existing:
                    txn_id = existing['txn_id']
                    py_order_id = existing['order_id'] if existing['order_id'] else payout_data['reference_id']
                else:
                    txn_id = self.generate_payout_txn_id(merchant_id, payout_data['reference_id'])
                    
                    import datetime as dt
                    py_order_id = f"PY_{int(dt.datetime.now().timestamp()*1000)}"

                    cursor.execute("""
                        INSERT INTO payout_transactions (
                            txn_id, merchant_id, admin_id, reference_id, order_id, amount, charge_amount,
                            charge_type, net_amount, bene_name, bene_email, bene_mobile,
                            bene_bank, ifsc_code, account_no, payment_type, purpose,
                            status, pg_partner, callback_url, remarks, created_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    """, (
                        txn_id, merchant_id, admin_id, payout_data['reference_id'], py_order_id,
                        payout_data['amount'], charge_amount, charge_type, net_amount,
                        payout_data['bene_name'], payout_data.get('bene_email', ''),
                        payout_data.get('bene_mobile', ''), payout_data.get('bank_name', ''),
                        payout_data['bene_ifsc'], payout_data['bene_account'],
                        payout_data.get('payment_mode', 'IMPS'), payout_data.get('narration', 'Payment'),
                        'INITIATED', 'MONEYONE2', payout_data.get('callback_url', ''),
                        payout_data.get('remarks', '')
                    ))
                    conn.commit()

                try:
                    headers = self._get_headers()
                except Exception as e:
                    return {'success': False, 'message': str(e)}

                py_order_id = payout_data.get('reference_id', '')
                
                base_url = os.getenv('BACKEND_URL', 'https://api.payflux.online')
                callback_url = f"{base_url}/api/callback/moneyone2/payout"
                
                # IMPORTANT: use MoneyOne 2 payout endpoint config if available
                tpin = Config.MNONE2_TPIN if hasattr(Config, 'MNONE2_TPIN') else '1234'
                
                payload = {
                    'order_id': payout_data.get('reference_id', ''),
                    'amount': float(payout_data['amount']),
                    'tpin': tpin,
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
                    error_msg = f'Moneyone 2 API error: HTTP {response.status_code} - {response.text}'
                    cursor.execute("UPDATE payout_transactions SET status = 'FAILED', error_message = %s, updated_at = NOW() WHERE txn_id = %s", (error_msg, txn_id))
                    conn.commit()
                    return {'success': False, 'message': error_msg}
                
                try:
                    moneyone2_response = response.json()
                except json.JSONDecodeError:
                    error_msg = 'Moneyone 2 API returned invalid JSON'
                    cursor.execute("UPDATE payout_transactions SET status = 'FAILED', error_message = %s, updated_at = NOW() WHERE txn_id = %s", (error_msg, txn_id))
                    conn.commit()
                    return {'success': False, 'message': error_msg}
                
                if not moneyone2_response.get('success'):
                    error_msg = moneyone2_response.get('message', 'Payout failed')
                    cursor.execute("UPDATE payout_transactions SET status = 'FAILED', error_message = %s, updated_at = NOW() WHERE txn_id = %s", (error_msg, txn_id))
                    conn.commit()
                    return {'success': False, 'message': error_msg}
                
                moneyone2_reference_id = moneyone2_response.get('reference_id')
                if not moneyone2_reference_id:
                    moneyone2_reference_id = py_order_id
                
                moneyone2_txn_id = moneyone2_response.get('txn_id')
                status = moneyone2_response.get('status', 'PENDING')
                
                status_map = {
                    'SUCCESS': 'SUCCESS', 'PENDING': 'QUEUED', 'FAILED': 'FAILED',
                    'PROCESSING': 'INPROCESS', 'INITIATED': 'QUEUED', 'QUEUED': 'QUEUED'
                }
                mapped_status = status_map.get(status.upper(), 'QUEUED')
                
                cursor.execute("""
                    UPDATE payout_transactions
                    SET status = %s, pg_txn_id = %s, updated_at = NOW()
                    WHERE txn_id = %s
                """, (mapped_status, moneyone2_txn_id or moneyone2_reference_id, txn_id))
                conn.commit()
                
                return {
                    'success': True,
                    'message': 'Payout initiated successfully',
                    'txn_id': txn_id,
                    'reference_id': payout_data['reference_id'],
                    'moneyone2_reference_id': moneyone2_reference_id,
                    'moneyone2_txn_id': moneyone2_txn_id or moneyone2_reference_id,
                    'status': mapped_status,
                    'amount': payout_data['amount'],
                    'charge_amount': charge_amount
                }
                
        except Exception as e:
            print(f"Moneyone 2 payout error: {e}")
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
                    cursor.execute("SELECT status, pg_txn_id, bank_ref_no, amount FROM payout_transactions WHERE reference_id = %s AND pg_partner = 'MONEYONE2'", (order_id,))
                elif transaction_id:
                    cursor.execute("SELECT status, pg_txn_id, bank_ref_no, amount, reference_id FROM payout_transactions WHERE pg_txn_id = %s AND pg_partner = 'MONEYONE2'", (transaction_id,))
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

moneyone2_service = Moneyone2Service()
