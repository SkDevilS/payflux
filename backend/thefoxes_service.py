"""
Thefoxes Payment Gateway Integration Service
Handles payin transactions through Thefoxes API
"""

import requests
import json
import base64
import binascii
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
from datetime import datetime
from config import Config
from database import get_db_connection
import threading
import time

class ThefoxesService:
    def __init__(self):
        self.base_url = Config.THEFOXES_BASE_URL
        self.secret_key = Config.THEFOXES_SECRET_KEY
        self.secret_hash = Config.THEFOXES_SECRET_HASH
        self.iv = 'a1f4c88b637e29cd3e1bc5a9d4b087ac'
        
    def _encrypt_payload(self, payload_dict):
        try:
            # Fix base64 padding (PHP is lenient, Python is strict)
            try:
                padded_key = self.secret_hash + '=' * (-len(self.secret_hash) % 4)
                key_bytes = base64.b64decode(padded_key)
            except Exception:
                # Fallback if the key is not actually base64 encoded
                key_bytes = self.secret_hash.encode('utf-8')
            
            # PHP's aes-256-cbc expects exactly 32 bytes, and automatically pads/truncates
            if len(key_bytes) < 32:
                key_bytes = key_bytes.ljust(32, b'\x00')
            elif len(key_bytes) > 32:
                key_bytes = key_bytes[:32]
                
            try:
                iv_bytes = binascii.unhexlify(self.iv)
            except Exception:
                iv_bytes = self.iv.encode('utf-8')
                
            if len(iv_bytes) < 16:
                iv_bytes = iv_bytes.ljust(16, b'\x00')
            elif len(iv_bytes) > 16:
                iv_bytes = iv_bytes[:16]
            
            cipher = AES.new(key_bytes, AES.MODE_CBC, iv_bytes)
            payload_str = json.dumps(payload_dict)
            padded_data = pad(payload_str.encode('utf-8'), AES.block_size)
            
            encrypted_bytes = cipher.encrypt(padded_data)
            return base64.b64encode(encrypted_bytes).decode('utf-8')
        except Exception as e:
            print(f"Error encrypting Thefoxes payload: {e}")
            import traceback
            traceback.print_exc()
            return None

    def calculate_charges(self, amount, scheme_id, service_type='PAYIN'):
        """Calculate charges based on scheme"""
        try:
            conn = get_db_connection()
            if not conn:
                return None, None, None
            
            with conn.cursor() as cursor:
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
        Create payin order via Thefoxes
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
                
                # Validate amount
                amount = float(order_data.get('amount', 0))
                if amount <= 0:
                    return {'success': False, 'message': 'Invalid amount'}
                
                # Calculate charges
                charge_amount, net_amount, charge_type = self.calculate_charges(
                    amount, merchant['scheme_id']
                )
                
                if charge_amount is None:
                    return {'success': False, 'message': 'Failed to calculate charges'}
                
                # Also create our internal transaction ID
                merchant_order_id = order_data.get('orderid')
                txn_id = f"TF_{merchant_id}_{merchant_order_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
                
                base_url = Config.BACKEND_URL if hasattr(Config, 'BACKEND_URL') else 'https://api.payflux.online'
                webhook_url = f"{base_url}/api/callback/thefoxes/payin"
                response_url = order_data.get('callbackurl') or order_data.get('callback_url') or webhook_url
                
                firstname = order_data.get('payee_fname', 'User')
                lastname = order_data.get('payee_lname', 'Name')
                email = order_data.get('payee_email', 'user@example.com')
                phone = order_data.get('payee_mobile', '9999999999')
                
                payload = {
                    "customer_user_id": str(merchant_id),
                    "merchant_order_id": str(merchant_order_id),
                    "first_name": firstname,
                    "last_name": lastname,
                    "email": email,
                    "phone_number": phone,
                    "amount": amount,
                    "membership_duration": 1,
                    "response_url": response_url,
                    "webhook_url": webhook_url
                }
                
                vpa = order_data.get('vpa', '').strip()
                if vpa:
                    payload['upi'] = vpa
                
                encrypted_data_b64 = self._encrypt_payload(payload)
                if not encrypted_data_b64:
                    return {'success': False, 'message': 'Failed to encrypt payload'}
                
                api_payload = {
                    'encrypted_data': encrypted_data_b64
                }
                
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.secret_key}'
                }
                
                url = f"{self.base_url}/v2/upi/payin"
                
                print(f"Calling Thefoxes Payin API: {url}")
                response = requests.post(url, headers=headers, json=api_payload, timeout=30)
                
                if response.status_code not in [200, 201]:
                    return {'success': False, 'message': f'Thefoxes API Error: {response.text}'}
                
                thefoxes_response = response.json()
                status = thefoxes_response.get('status')
                
                if status in ['failed', 'unauthorized', 'validation_error', 'blocked']:
                    return {'success': False, 'message': thefoxes_response.get('message', 'Order creation failed')}
                
                authenticate_url = thefoxes_response.get('authenticate_url', '')
                thefoxes_txn_id = thefoxes_response.get('transaction_id', '')
                
                # Extract upi_intent link directly from Thefoxes response
                upi_intent = thefoxes_response.get('upi_intent', '')
                
                # Insert transaction record
                cursor.execute("""
                    INSERT INTO payin_transactions (
                        txn_id, merchant_id, order_id, amount, charge_amount, 
                        charge_type, net_amount, payee_name, payee_email, 
                        payee_mobile, product_info, status, pg_partner,
                        pg_txn_id, callback_url, created_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                    )
                """, (
                    txn_id, merchant_id, merchant_order_id, amount, charge_amount, 
                    charge_type, net_amount, f"{firstname} {lastname}".strip(), email, phone, 
                    order_data.get('productinfo', 'Payment'), 'INITIATED', 'THEFOXES', 
                    thefoxes_txn_id, response_url
                ))
                
                conn.commit()
                
                # Start background status check
                self.auto_check_status_after_delay(merchant_order_id, thefoxes_txn_id)
                
                return {
                    'success': True,
                    'txn_id': txn_id,
                    'order_id': merchant_order_id,
                    'amount': amount,
                    'charge_amount': charge_amount,
                    'net_amount': net_amount,
                    'authenticate_url': authenticate_url,
                    'thefoxes_txn_id': thefoxes_txn_id,
                    'upi_intent': upi_intent
                }
                
        except Exception as e:
            print(f"Create payin order error: {e}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'message': f'Internal error: {str(e)}'}
        finally:
            if conn:
                conn.close()

    def check_payment_status(self, merchant_order_id, thefoxes_txn_id=None, utr=None):
        """
        Check payment status on Thefoxes
        """
        try:
            url = f"{self.base_url}/v2/upi/status"
            
            payload = {}
            if merchant_order_id:
                payload["merchant_order_id"] = merchant_order_id
            if thefoxes_txn_id:
                payload["transaction_id"] = thefoxes_txn_id
            if utr:
                payload["utr"] = utr
                
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': f'Bearer {self.secret_key}'
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            
            if response.status_code not in [200, 201]:
                return {'success': False, 'message': f'Status check failed: {response.text}'}
                
            status_response = response.json()
            
            # success, failed, pending, unauthorized, validation_error, notfound
            res_status = status_response.get('status')
            
            result = {
                'success': True,
                'status': 'INITIATED',
                'txnId': status_response.get('transaction_id'),
                'utr': status_response.get('utr'),
                'amount': status_response.get('amount'),
                'message': status_response.get('message', 'Status retrieved')
            }
            
            if res_status == 'success':
                result['status'] = 'SUCCESS'
            elif res_status == 'failed':
                result['status'] = 'FAILED'
            elif res_status == 'pending':
                result['status'] = 'PENDING'
                
            return result
            
        except Exception as e:
            print(f"Check payment status error: {e}")
            return {'success': False, 'message': f'Status check error: {str(e)}'}
            
    def auto_check_status_after_delay(self, order_id, thefoxes_txn_id, delay_seconds=60):
        def check_status_task():
            try:
                time.sleep(delay_seconds)
                conn = get_db_connection()
                if not conn: return
                
                try:
                    with conn.cursor() as cursor:
                        cursor.execute("""
                            SELECT txn_id, order_id, merchant_id, status, net_amount, charge_amount
                            FROM payin_transactions
                            WHERE order_id = %s AND pg_partner = 'THEFOXES'
                        """, (order_id,))
                        
                        txn = cursor.fetchone()
                        
                        if not txn or txn['status'] not in ['INITIATED', 'PENDING']:
                            return
                        
                        status_result = self.check_payment_status(order_id, thefoxes_txn_id)
                        
                        if not status_result.get('success'):
                            return
                        
                        pg_status = status_result.get('status')
                        
                        if pg_status == 'SUCCESS' and txn['status'] != 'SUCCESS':
                            cursor.execute("""
                                UPDATE payin_transactions
                                SET status = 'SUCCESS', bank_ref_no = %s, pg_txn_id = %s, payment_mode = 'UPI',
                                    completed_at = NOW(), updated_at = NOW()
                                WHERE txn_id = %s
                            """, (status_result.get('utr'), status_result.get('txnId'), txn['txn_id']))
                            
                            # Check if wallet already credited (idempotency)
                            cursor.execute("""
                                SELECT COUNT(*) as count FROM merchant_wallet_transactions
                                WHERE reference_id = %s AND txn_type = 'UNSETTLED_CREDIT'
                            """, (txn['txn_id'],))
                            
                            wallet_already_credited = cursor.fetchone()['count'] > 0
                            
                            if not wallet_already_credited:
                                from wallet_service import wallet_service as wallet_svc
                                wallet_svc.credit_unsettled_wallet(
                                    merchant_id=txn['merchant_id'],
                                    amount=float(txn['net_amount']),
                                    description=f"PayIn received (Thefoxes) - {order_id}",
                                    reference_id=txn['txn_id']
                                )
                                wallet_svc.credit_admin_unsettled_wallet(
                                    admin_id='admin',
                                    amount=float(txn['charge_amount']),
                                    description=f"PayIn charge (Thefoxes) - {order_id}",
                                    reference_id=txn['txn_id']
                                )
                            
                            conn.commit()
                        elif pg_status == 'FAILED' and txn['status'] != 'FAILED':
                            cursor.execute("""
                                UPDATE payin_transactions
                                SET status = 'FAILED', pg_txn_id = %s, completed_at = NOW(), updated_at = NOW()
                                WHERE txn_id = %s
                            """, (status_result.get('txnId'), txn['txn_id']))
                            conn.commit()
                finally:
                    conn.close()
            except Exception as e:
                print(f"Auto status check error: {e}")
        
        thread = threading.Thread(target=check_status_task, daemon=True)
        thread.start()

    def initiate_payout(self, merchant_id, payout_data, admin_id=None):
        """
        Initiate payout via Thefoxes
        """
        try:
            amount = float(payout_data.get('amount', 0))
            if amount <= 0:
                return {'success': False, 'message': 'Invalid amount'}
                
            reference_id = payout_data.get('reference_id')
            if not reference_id:
                return {'success': False, 'message': 'Reference ID required'}
                
            base_url = Config.BACKEND_URL if hasattr(Config, 'BACKEND_URL') else 'https://api.payflux.online'
            webhook_url = f"{base_url}/api/callback/thefoxes/payout"
            
            payload = {
                "order_id": str(reference_id),
                "amount": str(int(amount)) if amount.is_integer() else str(amount),
                "payment_mode": "IMPS",
                "bank_name": payout_data.get('bank_name', 'Bank'),
                "bank_account_number": payout_data.get('bene_account', ''),
                "ifsc_code": payout_data.get('bene_ifsc', ''),
                "account_holder_name": payout_data.get('bene_name', 'User'),
                "account_type": 1,
                "customer_email": "customer@paysutra.com",
                "customer_phone_no": "9999999999",
                "remark": "Payout Request",
                "response_url": webhook_url,
                "webhook_url": webhook_url
            }
            
            encrypted_data_b64 = self._encrypt_payload(payload)
            if not encrypted_data_b64:
                return {'success': False, 'message': 'Failed to encrypt payload'}
                
            api_payload = {
                'encrypted_data': encrypted_data_b64
            }
            
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.secret_key}'
            }
            
            url = f"{self.base_url}/v2/payout"
            
            print(f"Calling Thefoxes Payout API: {url}")
            response = requests.post(url, headers=headers, json=api_payload, timeout=30)
            
            if response.status_code not in [200, 201, 303]:
                error_msg = 'Order creation failed'
                try:
                    error_res = response.json()
                    error_msg = error_res.get('message', error_msg)
                except:
                    error_msg = response.text
                return {'success': False, 'message': f'Thefoxes API Error: {error_msg}'}
                
            thefoxes_response = response.json()
            # In response, we have status (200, 303, 400), message, transaction obj
            res_status = thefoxes_response.get('status')
            transaction_info = thefoxes_response.get('transaction', {})
            
            thefoxes_txn_id = transaction_info.get('transaction_id')
            utr = transaction_info.get('utr', '')
            api_message = transaction_info.get('message', thefoxes_response.get('message', ''))
            txn_status = transaction_info.get('status', 'pending').lower()
            
            status_map = {
                'success': 'SUCCESS',
                'pending': 'QUEUED',
                'failed': 'FAILED'
            }
            mapped_status = status_map.get(txn_status, 'QUEUED')
            
            if str(res_status) == '400' or mapped_status == 'FAILED':
                return {'success': False, 'message': api_message}
                
            return {
                'success': True,
                'status': mapped_status,
                'message': api_message,
                'thefoxes_txn_id': thefoxes_txn_id,
                'utr': utr
            }
            
        except Exception as e:
            print(f"Thefoxes initiate payout error: {e}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'message': f'Internal error: {str(e)}'}

    def check_payout_status(self, thefoxes_txn_id=None, merchant_order_id=None, utr=None):
        """
        Check payout status on Thefoxes
        """
        try:
            url = f"{self.base_url}/v2/payout/status"
            
            payload = {}
            if thefoxes_txn_id:
                payload["transaction_id"] = thefoxes_txn_id
            if merchant_order_id:
                payload["merchant_order_id"] = merchant_order_id
            if utr:
                payload["utr"] = utr
                
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': f'Bearer {self.secret_key}'
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            
            if response.status_code not in [200, 201]:
                return {'success': False, 'message': f'Status check failed: {response.text}'}
                
            status_response = response.json()
            
            transaction_info = status_response.get('transaction', {})
            res_status = status_response.get('status')
            
            # API can return 200 with status info inside transaction object
            txn_status = transaction_info.get('status', '').lower()
            
            result = {
                'success': True,
                'status': 'QUEUED',
                'txn_id': transaction_info.get('transaction_id'),
                'utr': transaction_info.get('utr'),
                'message': transaction_info.get('message', status_response.get('message', 'Status retrieved'))
            }
            
            if txn_status == 'success':
                result['status'] = 'SUCCESS'
            elif txn_status == 'failed':
                result['status'] = 'FAILED'
            elif txn_status == 'pending':
                result['status'] = 'QUEUED'
                
            return result
            
        except Exception as e:
            print(f"Check payout status error: {e}")
            return {'success': False, 'message': f'Status check error: {str(e)}'}

thefoxes_service = ThefoxesService()
