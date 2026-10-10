import hmac
import hashlib
import time
import uuid
import requests
from config import Config
from database import get_db_connection
from datetime import datetime

from simple_cache import cache_for_seconds

class SingpayService:
    def __init__(self):
        self.base_url = Config.SINGPAY_BASE_URL
        self.merchant_id = Config.SINGPAY_MERCHANT_ID
        self.secret_key = str(Config.SINGPAY_SECRET_KEY).strip() if Config.SINGPAY_SECRET_KEY else ''
    
    def generate_signature(self, params):
        items = {}
        for k, v in params.items():
            if k == 'sign' or v is None or str(v) == '':
                continue
                
            val_str = str(v)
            if k == 'amount':
                try:
                    val_str = "%.2f" % float(v)
                except ValueError:
                    pass
            elif k == 'currency':
                val_str = val_str.upper()
            elif k == 'ifsc':
                val_str = val_str.strip().upper()
            elif k in ['target_account', 'remark']:
                val_str = val_str.strip()
                if not val_str:
                    continue
                    
            items[k] = val_str

        raw = "&".join(f"{k}={items[k]}" for k in sorted(items)) + self.secret_key
        return hashlib.md5(raw.encode("utf-8")).hexdigest().lower()

    @cache_for_seconds(60)
    def calculate_charges(self, amount, scheme_id, service_type='PAYIN'):
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
        
    def create_payin_order(self, merchant_id, order_data):
        try:
            conn = get_db_connection()
            if not conn:
                return {'success': False, 'message': 'Database connection failed'}
            
            with conn.cursor() as cursor:
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
                
                charge_amount, net_amount, charge_type = self.calculate_charges(amount, merchant['scheme_id'], 'PAYIN')
                
                if charge_amount is None:
                    return {'success': False, 'message': 'Failed to calculate charges'}
                
                order_id = order_data.get('orderid')
                txn_id = f"SGP_{merchant_id}_{order_id}_{int(time.time())}"
                gateway_callback_url = f"{Config.API_BASE_URL}/api/callback/singpay" if hasattr(Config, 'API_BASE_URL') else f"https://api.payflux.online/api/callback/singpay"
                
                # Extract merchant callback url (user usually passes 'callbackurl' or 'callback_url')
                merchant_callback_url = order_data.get('callbackurl', order_data.get('callback_url', ''))
                
                # We save it into payin_transactions first
                cursor.execute("""
                    INSERT INTO payin_transactions (
                        txn_id, order_id, merchant_id, amount, charge_amount, net_amount,
                        status, pg_partner, payee_name, payee_email, payee_mobile,
                        payment_mode, callback_url, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, 'INITIATED', 'Singpay', %s, %s, %s, 'UPI', %s, NOW(), NOW())
                """, (
                    txn_id, order_id, merchant_id, amount, charge_amount, net_amount,
                    order_data.get('payee_fname', ''), order_data.get('payee_email', ''), order_data.get('payee_mobile', ''),
                    merchant_callback_url
                ))
                
                conn.commit()
                
                base_url = self.base_url.rstrip('/')
                endpoint = f"{base_url}/api/payment/pay"
                
                payload = {
                    "merchant_no": str(self.merchant_id),
                    "order_id": txn_id,
                    "amount": "%.2f" % float(amount),
                    "user_name": order_data.get('payee_fname', 'Customer') or 'Customer',
                    "currency": "INR",
                    "payment_method": "upi",
                    "notify_url": gateway_callback_url,
                    "timestamp": int(time.time()),
                    "nonce": uuid.uuid4().hex
                }
                
                payload['sign'] = self.generate_signature(payload)
                
                response = requests.post(endpoint, json=payload, timeout=30)
                
                try:
                    data = response.json()
                except Exception as e:
                    print(f"Singpay Payin API Error (Not JSON): {response.status_code} - {response.text}")
                    return {'success': False, 'message': f"API Error: {response.text[:200]}"}
                
                if data.get('code') == 0 and 'data' in data:
                    return {
                        'success': True,
                        'payment_url': data['data'].get('pay_url'),
                        'payment_link': data['data'].get('deeplink'),
                        'txn_id': txn_id,
                        'order_id': order_id,
                        'amount': amount,
                        'net_amount': net_amount,
                        'pg_txn_id': data['data'].get('order_no')
                    }
                else:
                    cursor.execute("UPDATE payin_transactions SET status='FAILED' WHERE txn_id=%s", (txn_id,))
                    conn.commit()
                    return {
                        'success': False,
                        'message': data.get('msg', 'Unknown error from Singpay API')
                    }
        except Exception as e:
            return {'success': False, 'message': str(e)}
        finally:
            if conn:
                conn.close()

    def initiate_payout(self, merchant_id, payout_data, admin_id=None):
        try:
            conn = get_db_connection()
            if not conn:
                return {'success': False, 'message': 'Database connection failed'}
                
            amount = float(payout_data['amount'])
            bank_account = payout_data.get('bene_account', '')
            ifsc = payout_data.get('bene_ifsc', '')
            user_name = payout_data.get('bene_name', 'Customer')
            mobile = payout_data.get('bene_mobile', '9999999999')
            email = payout_data.get('bene_email', 'customer@example.com')
            db_txn_id = payout_data.get('txn_id', '')
            reference_id = payout_data.get('reference_id', '')
            callback_url = f"{Config.API_BASE_URL}/api/callback/singpay/payout" if hasattr(Config, 'API_BASE_URL') else f"https://api.payflux.online/api/callback/singpay/payout"
            
            with conn.cursor() as cursor:
                # Update pg_partner in payout_transactions
                cursor.execute("""
                    UPDATE payout_transactions
                    SET pg_partner = 'Singpay', updated_at = NOW()
                    WHERE txn_id = %s
                """, (db_txn_id,))
                conn.commit()
                
            base_url = self.base_url.rstrip('/')
            endpoint = f"{base_url}/api/payment/payout"
            
            payload = {
                "merchant_no": str(self.merchant_id),
                "order_id": db_txn_id,
                "amount": "%.2f" % float(amount),
                "target_name": user_name or 'Customer',
                "target_account": str(bank_account).strip(),
                "ifsc": str(ifsc).strip().upper(),
                "currency": "INR",
                "notify_url": callback_url,
                "timestamp": int(time.time()),
                "nonce": uuid.uuid4().hex
            }
            
            payload['sign'] = self.generate_signature(payload)
            
            response = requests.post(endpoint, json=payload, timeout=30)
            
            try:
                data = response.json()
            except Exception as e:
                print(f"Singpay Payout API Error (Not JSON): {response.status_code} - {response.text}")
                return {'success': False, 'message': f"API Error: {response.text[:200]}"}
            
            if data.get('code') == 0 and 'data' in data:
                return {
                    'success': True,
                    'status': 'QUEUED',
                    'orderId': data['data'].get('order_no'),
                    'message': 'Payout submitted successfully'
                }
            return {
                'success': False,
                'message': data.get('msg', 'Unknown error from Singpay Payout API')
            }
        except Exception as e:
            return {'success': False, 'message': str(e)}
        finally:
            if 'conn' in locals() and conn:
                conn.close()

singpay_service = SingpayService()
