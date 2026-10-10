"""
Paytm_Megacart Payment Gateway Integration Service
Handles UPI Intent payin transactions through Paytm Megacart
"""

import requests
import json
import hashlib
import base64
import random
import string
import os
import threading
import time
from datetime import datetime
from Crypto.Cipher import AES
from config import Config
from database import get_db_connection

class PaytmMegacartService:
    def __init__(self):
        self.base_url = getattr(Config, 'PAYTM_MEGACART_BASE_URL', os.getenv('PAYTM_MEGACART_BASE_URL', 'https://securegw.paytm.in'))
        self.mid = getattr(Config, 'PAYTM_MEGACART_MID', os.getenv('PAYTM_MEGACART_MID', ''))
        self.merchant_key = getattr(Config, 'PAYTM_MEGACART_MERCHANT_KEY', os.getenv('PAYTM_MEGACART_MERCHANT_KEY', ''))
        self.website_name = getattr(Config, 'PAYTM_MEGACART_WEBSITE_NAME', os.getenv('PAYTM_MEGACART_WEBSITE_NAME', 'DEFAULT'))
        self.iv = "@@@@&&&&####$$$$"
        self.block_size = 16

    # ==========================================
    # Checksum Algorithm (Section I, K of Docs)
    # ==========================================
    def _pad(self, s):
        pad_len = self.block_size - len(s) % self.block_size
        return s + chr(pad_len) * pad_len

    def _unpad(self, s):
        return s[:-ord(s[-1])]

    def get_string_by_params(self, params):
        keys = sorted(params.keys())
        values = []
        for k in keys:
            val = params[k]
            if val is None or str(val).lower() == 'null':
                values.append('')
            else:
                values.append(str(val))
        return '|'.join(values)

    def random_salt(self, length=4):
        return ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(length))

    def generate_signature(self, params, key):
        """
        Generate Paytm checksum signature for request params or string.
        Uses official PaytmChecksum library if installed, otherwise manual fallback.
        """
        try:
            try:
                import PaytmChecksum
                return PaytmChecksum.generateSignature(params, key)
            except (ImportError, Exception):
                pass

            if isinstance(params, dict):
                param_string = self.get_string_by_params(params)
            else:
                param_string = str(params)

            salt = self.random_salt(4)
            h = hashlib.sha256((param_string + "|" + salt).encode("utf8")).hexdigest()
            h += salt

            cipher = AES.new(key.encode("utf8"), AES.MODE_CBC, self.iv.encode("utf8"))
            encrypted = cipher.encrypt(self._pad(h).encode("utf8"))
            return base64.b64encode(encrypted).decode("utf8")
        except Exception as e:
            print(f"Generate signature error: {e}")
            return None

    def verify_signature(self, params, key, checksum):
        """
        Verify incoming checksum signature from response or webhook.
        Uses official PaytmChecksum library if installed, otherwise manual fallback.
        """
        try:
            if not key or not checksum:
                return False
            p = dict(params) if isinstance(params, dict) else params
            if isinstance(p, dict):
                p.pop("CHECKSUMHASH", None)
                p.pop("checksumHash", None)
                p.pop("checksumhash", None)

            checksum_clean = str(checksum).strip()

            # Attempt verification with official PaytmChecksum SDK first
            try:
                import PaytmChecksum
                if PaytmChecksum.verifySignature(p, key, checksum_clean):
                    return True
            except (ImportError, Exception):
                pass

            if isinstance(p, dict):
                param_string = self.get_string_by_params(p)
            else:
                param_string = str(p)

            encrypted = base64.b64decode(checksum_clean)
            cipher = AES.new(key.encode("utf8"), AES.MODE_CBC, self.iv.encode("utf8"))
            decrypted = self._unpad(cipher.decrypt(encrypted).decode("utf8"))

            salt = decrypted[-4:]
            h = decrypted[:-4]
            expected = hashlib.sha256((param_string + "|" + salt).encode("utf8")).hexdigest()
            if h != expected:
                print(f"[PAYTM CHECKSUM MISMATCH] Expected hash: {expected} | Decrypted hash: {h} | Param string: '{param_string}' | Salt: '{salt}'")
            return h == expected
        except Exception as e:
            print(f"Verify signature error: {e}")
            return False

    # ==========================================
    # Charge Calculation
    # ==========================================
    def calculate_charges(self, amount, scheme_id):
        """Calculate charges based on scheme"""
        conn = None
        try:
            conn = get_db_connection()
            if not conn:
                return None, None, None

            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT charge_value, charge_type
                    FROM commercial_charges
                    WHERE scheme_id = %s 
                    AND service_type = 'PAYIN'
                    AND %s BETWEEN min_amount AND max_amount
                    ORDER BY min_amount DESC
                    LIMIT 1
                """, (scheme_id, amount))
                
                charge_config = cursor.fetchone()
                
                if not charge_config:
                    return 0.00, amount, 'FIXED'
                
                charge_type = charge_config['charge_type']
                charge_value = float(charge_config['charge_value'])
                
                if charge_type == 'PERCENTAGE':
                    charge_amount = (amount * charge_value) / 100
                else:
                    charge_amount = charge_value
                
                net_amount = amount - charge_amount
                return round(charge_amount, 2), round(net_amount, 2), charge_type
                
        except Exception as e:
            print(f"Calculate charges error: {e}")
            return None, None, None
        finally:
            if conn:
                conn.close()

    # ==========================================
    # Create Payin Order (Initiate + Process)
    # ==========================================
    def create_payin_order(self, merchant_id, order_data):
        """
        Create payin order via Paytm Megacart UPI Intent flow:
        1. POST /theia/api/v1/initiateTransaction -> get txnToken
        2. POST /theia/api/v1/processTransaction -> get upi://pay deepLink
        """
        conn = None
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

                charge_amount, net_amount, charge_type = self.calculate_charges(amount, merchant['scheme_id'])
                if charge_amount is None:
                    return {'success': False, 'message': 'Failed to calculate charges'}

                merchant_order_id = order_data.get('orderid', '')
                if not merchant_order_id:
                    return {'success': False, 'message': 'Order ID is required'}

                # Generate transaction ID with PM_MEG_ prefix
                txn_id = f"PM_MEG_{merchant_id}_{merchant_order_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"

                firstname = order_data.get('payee_fname', 'User')
                lastname = order_data.get('payee_lname', 'Name')
                email = order_data.get('payee_email', 'user@example.com')
                phone = order_data.get('payee_mobile', '9999999999')

                base_url = getattr(Config, 'BACKEND_URL', os.getenv('BACKEND_URL', 'https://api.payflux.online'))
                webhook_url = f"{base_url}/api/callback/paytm_megacart/payin?ref={txn_id}"
                response_url = order_data.get('callbackurl') or order_data.get('callback_url') or webhook_url

                if not self.mid or not self.merchant_key:
                    return {'success': False, 'message': 'Paytm Megacart MID or Merchant Key is not configured'}

                # Step 1: Initiate Transaction
                init_body = {
                    "requestType": "Payment",
                    "mid": self.mid,
                    "websiteName": self.website_name,
                    "orderId": str(merchant_order_id),
                    "txnAmount": {
                        "value": f"{amount:.2f}",
                        "currency": "INR"
                    },
                    "userInfo": {
                        "custId": f"CUST_{merchant_id}"
                    },
                    "callbackUrl": webhook_url
                }

                init_body_str = json.dumps(init_body, separators=(',', ':'))
                signature = self.generate_signature(init_body_str, self.merchant_key)

                init_payload = {
                    "body": init_body,
                    "head": {
                        "signature": signature
                    }
                }

                init_url = f"{self.base_url}/theia/api/v1/initiateTransaction?mid={self.mid}&orderId={merchant_order_id}"
                print(f"Calling Paytm Megacart Initiate Transaction: {init_url}")
                init_res = requests.post(
                    init_url,
                    headers={'Content-Type': 'application/json'},
                    data=json.dumps(init_payload, separators=(',', ':')),
                    timeout=30
                )

                if init_res.status_code != 200:
                    return {'success': False, 'message': f'Paytm Initiate Error: {init_res.text}'}

                init_data = init_res.json()
                result_info = init_data.get('body', {}).get('resultInfo', {})
                if result_info.get('resultStatus') != 'S':
                    err_msg = result_info.get('resultMsg', 'Initiate transaction failed')
                    print(f"[PAYTM MEGACART ERROR] initiateTransaction failed for {merchant_order_id}: {err_msg} | Code: {result_info.get('resultCode')} | Full Response: {init_data}")
                    return {
                        'success': False,
                        'message': err_msg
                    }

                txn_token = init_data.get('body', {}).get('txnToken')
                if not txn_token:
                    return {'success': False, 'message': 'No txnToken received from Paytm'}

                # Step 2: Process Transaction to get UPI Intent Deep Link
                process_payload = {
                    "head": {
                        "txnToken": txn_token
                    },
                    "body": {
                        "requestType": "NATIVE",
                        "mid": self.mid,
                        "orderId": str(merchant_order_id),
                        "paymentMode": "UPI_INTENT"
                    }
                }

                # If specific PSP app requested
                psp_app = order_data.get('pspApp')
                if psp_app:
                    process_payload['body']['pspApp'] = psp_app

                process_url = f"{self.base_url}/theia/api/v1/processTransaction?mid={self.mid}&orderId={merchant_order_id}"
                print(f"Calling Paytm Megacart Process Transaction: {process_url}")
                proc_res = requests.post(
                    process_url,
                    headers={'Content-Type': 'application/json'},
                    data=json.dumps(process_payload, separators=(',', ':')),
                    timeout=30
                )

                if proc_res.status_code != 200:
                    return {'success': False, 'message': f'Paytm Process Error: {proc_res.text}'}

                proc_data = proc_res.json()
                proc_result_info = proc_data.get('body', {}).get('resultInfo', {})
                if proc_result_info.get('resultStatus') != 'S':
                    err_msg = proc_result_info.get('resultMsg', 'Process transaction failed')
                    print(f"[PAYTM MEGACART ERROR] processTransaction failed for {merchant_order_id}: {err_msg} | Code: {proc_result_info.get('resultCode')} | Full Response: {proc_data}")
                    return {
                        'success': False,
                        'message': err_msg
                    }

                deep_link_info = proc_data.get('body', {}).get('deepLinkInfo', {})
                deep_link = deep_link_info.get('deepLink', '')
                trans_id = deep_link_info.get('transId', '')

                if not deep_link:
                    return {'success': False, 'message': 'No UPI Intent deepLink received from Paytm Megacart'}

                # Insert transaction into database
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
                    order_data.get('productinfo', 'Payment'), 'INITIATED', 'PAYTM_MEGACART', 
                    trans_id, response_url
                ))
                
                conn.commit()

                # Start background status check thread
                self.auto_check_status_after_delay(merchant_order_id, trans_id)

                return {
                    'success': True,
                    'txn_id': txn_id,
                    'order_id': merchant_order_id,
                    'amount': amount,
                    'charge_amount': charge_amount,
                    'net_amount': net_amount,
                    'intent_url': deep_link,
                    'upi_link': deep_link,
                    'qr_string': deep_link,
                    'payment_link': deep_link,
                    'txn_token': txn_token,
                    'trans_id': trans_id,
                    'pg_partner': 'PAYTM_MEGACART'
                }

        except Exception as e:
            print(f"Create payin order error (Paytm Megacart): {e}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'message': f'Internal error: {str(e)}'}
        finally:
            if conn:
                conn.close()

    # ==========================================
    # Check Payment Status (Step 4 of Docs)
    # ==========================================
    def check_payment_status(self, merchant_order_id, pg_txn_id=None, utr=None):
        """
        Check payment status server-to-server with Paytm
        POST /v3/order/status
        """
        conn = None
        try:
            if not self.mid or not self.merchant_key:
                return {'success': False, 'message': 'Paytm Megacart not configured'}

            status_body = {
                "mid": self.mid,
                "orderId": str(merchant_order_id)
            }
            status_body_str = json.dumps(status_body, separators=(',', ':'))
            signature = self.generate_signature(status_body_str, self.merchant_key)

            payload = {
                "body": status_body,
                "head": {
                    "signature": signature
                }
            }

            url = f"{self.base_url}/v3/order/status"
            print(f"Checking Paytm Megacart order status: {url}")
            response = requests.post(
                url,
                headers={'Content-Type': 'application/json'},
                data=json.dumps(payload, separators=(',', ':')),
                timeout=20
            )

            if response.status_code != 200:
                return {'success': False, 'message': f'Paytm Status API error: {response.text}'}

            data = response.json()
            body = data.get('body', {}) if isinstance(data, dict) and 'body' in data else data
            result_info = body.get('resultInfo', {})
            api_result_status = result_info.get('resultStatus', '')

            # If the API call returned PENDING or TXN_PENDING, treat as QUEUED/PENDING
            if api_result_status not in ['S', 'TXN_PENDING', 'PENDING', 'P', 'TXN_SUCCESS', 'SUCCESS'] and not body.get('STATUS'):
                err_msg = result_info.get('resultMsg', 'Order status check failed')
                print(f"[PAYTM MEGACART ERROR] /v3/order/status API error for {merchant_order_id}: {err_msg} | Full Response: {data}")
                return {
                    'success': False,
                    'message': err_msg,
                    'status': 'QUEUED'
                }

            raw_status = body.get('STATUS', '') or api_result_status
            paytm_txn_id = body.get('TXNID') or pg_txn_id or ''
            bank_txn_id = body.get('BANKTXNID') or utr or ''
            resp_msg = body.get('RESPMSG') or result_info.get('resultMsg', '')

            mapped_status = 'QUEUED'
            if raw_status in ['TXN_SUCCESS', 'SUCCESS', 'S']:
                mapped_status = 'SUCCESS'
            elif raw_status in ['TXN_FAILURE', 'FAILED', 'TXN_FAILURE_AUTO_REFUND']:
                mapped_status = 'FAILED'
            elif raw_status in ['PENDING', 'TXN_PENDING', 'P']:
                mapped_status = 'QUEUED'

            conn = get_db_connection()
            if not conn:
                return {'success': False, 'message': 'Database connection failed'}

            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT txn_id, merchant_id, order_id, status, amount, charge_amount,
                           net_amount, callback_url
                    FROM payin_transactions
                    WHERE order_id = %s AND pg_partner = 'PAYTM_MEGACART'
                    ORDER BY created_at DESC
                    LIMIT 1
                """, (merchant_order_id,))
                
                txn = cursor.fetchone()
                if not txn:
                    return {'success': False, 'message': 'Transaction not found in local database'}

                # If already final, return existing
                if txn['status'] in ['SUCCESS', 'FAILED']:
                    return {
                        'success': True,
                        'status': txn['status'],
                        'utr': bank_txn_id,
                        'pg_txn_id': paytm_txn_id,
                        'message': 'Already in terminal state'
                    }

                if mapped_status == 'SUCCESS':
                    cursor.execute("""
                        UPDATE payin_transactions
                        SET status = 'SUCCESS', bank_ref_no = %s, pg_txn_id = %s, payment_mode = 'UPI',
                            completed_at = NOW(), updated_at = NOW()
                        WHERE txn_id = %s
                    """, (bank_txn_id, paytm_txn_id, txn['txn_id']))

                    # Credit unsettled wallet if not credited yet
                    cursor.execute("""
                        SELECT COUNT(*) as count FROM merchant_wallet_transactions
                        WHERE reference_id = %s AND txn_type = 'UNSETTLED_CREDIT'
                    """, (txn['txn_id'],))

                    if cursor.fetchone()['count'] == 0:
                        from wallet_service import wallet_service as wallet_svc
                        wallet_svc.credit_unsettled_wallet(
                            merchant_id=txn['merchant_id'],
                            amount=float(txn['net_amount']),
                            description=f"PayIn received (Paytm Megacart) - {merchant_order_id}",
                            reference_id=txn['txn_id']
                        )
                        wallet_svc.credit_admin_unsettled_wallet(
                            admin_id='admin',
                            amount=float(txn['charge_amount']),
                            description=f"PayIn charge (Paytm Megacart) - {merchant_order_id}",
                            reference_id=txn['txn_id']
                        )

                    conn.commit()

                elif mapped_status == 'FAILED':
                    cursor.execute("""
                        UPDATE payin_transactions
                        SET status = 'FAILED', pg_txn_id = %s, completed_at = NOW(), updated_at = NOW()
                        WHERE txn_id = %s
                    """, (paytm_txn_id, txn['txn_id']))
                    conn.commit()

                # Forward callback webhook to merchant using Thefoxes forwarding format
                if mapped_status in ['SUCCESS', 'FAILED'] and txn.get('callback_url') and txn.get('merchant_id'):
                    self.send_merchant_webhook(txn, merchant_order_id, mapped_status, bank_txn_id, resp_msg)

                return {
                    'success': True,
                    'status': mapped_status,
                    'utr': bank_txn_id,
                    'pg_txn_id': paytm_txn_id,
                    'message': resp_msg
                }

        except Exception as e:
            print(f"Check payment status error (Paytm Megacart): {e}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'message': f'Error checking status: {str(e)}'}
        finally:
            if conn:
                conn.close()

    def send_merchant_webhook(self, txn, merchant_order_id, mapped_status, utr, message=''):
        """
        Forward webhook to merchant callback_url using Thefoxes callback forwarding format
        """
        if not txn.get('callback_url') or not txn.get('merchant_id'):
            return
        
        webhook_data = {
            'txn_id': txn['txn_id'],
            'reference_id': merchant_order_id,
            'amount': float(txn['amount']) if txn.get('amount') else 0.0,
            'status': mapped_status,
            'utr': utr or '',
            'message': message or 'Txn Processed',
            'pg_partner': 'PAYTM_MEGACART'
        }

        if str(txn['merchant_id']) == '7894560001':
            webhook_data['order_id'] = merchant_order_id

        try:
            print(f"MERCHANT CALLBACK FORWARDING - PAYTM_MEGACART (Thefoxes format) to {txn['callback_url']}: {webhook_data}")
            requests.post(txn['callback_url'], json=webhook_data, timeout=5)
        except Exception as e:
            print(f"Failed to send merchant webhook for txn {txn['txn_id']}: {str(e)}")

    def auto_check_status_after_delay(self, merchant_order_id, trans_id, delay=15):
        """Start background thread to auto-check status after delay"""
        def run_check():
            time.sleep(delay)
            self.check_payment_status(merchant_order_id, trans_id)

        thread = threading.Thread(target=run_check, daemon=True)
        thread.start()

paytm_megacart_service = PaytmMegacartService()
