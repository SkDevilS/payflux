"""
MoneyOne Callback Routes
Handles webhook callbacks from MoneyOne payment gateway
"""

from flask import Blueprint, request, jsonify
from database import get_db_connection
from datetime import datetime
import json
import base64

# Webhook endpoint mapping to /payin/callback/moneyone
moneyone_callback_bp = Blueprint('moneyone_callback', __name__, url_prefix='/payin/callback')

@moneyone_callback_bp.route('/moneyone', methods=['POST'])
def moneyone_payin_callback():
    """
    Webhook endpoint for MoneyOne payin status updates
    Expected callback format: JSON payload
    {
      "txn_id": "...",
      "order_id": "...",
      "status": "SUCCESS",
      "utr": "...",
      "pg_partner": "...",
      "amount": 50,
      ...
    }
    """
    try:
        print("=" * 80)
        print("MoneyOne Payin Callback Received")
        print("=" * 80)

        # Log request details
        print(f"Method: {request.method}")
        print(f"Content-Type: {request.content_type}")
        
        callback_data = None
        if request.is_json:
            callback_data = request.json
        elif request.data:
            try:
                callback_data = json.loads(request.data.decode('utf-8'))
            except:
                pass
                
        if not callback_data:
            print("ERROR: No valid JSON data received")
            return jsonify({'success': False, 'message': 'Invalid data format'}), 400

        print(f"Callback Data: {json.dumps(callback_data, indent=2)}")

        # Extract data from callback
        status = callback_data.get('status', '')                  # "SUCCESS" or "FAILED"
        client_id = callback_data.get('order_id', '')             # Our order_id (from payload)
        payid = callback_data.get('txn_id', '')                   # MoneyOne txn_id
        operator_ref = callback_data.get('utr', '')               # UTR
        amount_received = callback_data.get('amount', 0)

        if not client_id:
            print("ERROR: No order_id in callback")
            return jsonify({'success': False, 'message': 'Missing order_id'}), 400

        print(f"MoneyOne Txn ID: {payid}")
        print(f"Client ID (Our Order ID): {client_id}")
        print(f"Operator Ref (UTR): {operator_ref}")
        print(f"Status: {status}")

        mapped_status = 'INITIATED'
        if status.upper() == 'SUCCESS':
            mapped_status = 'SUCCESS'
        elif status.upper() == 'FAILED':
            mapped_status = 'FAILED'
        else:
            mapped_status = status.upper()

        # Update database
        conn = get_db_connection()
        if not conn:
            print("ERROR: Database connection failed")
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500

        try:
            with conn.cursor() as cursor:
                # Find transaction by order_id (using txn_id because we sent txn_id as orderid to MoneyOne)
                cursor.execute("""
                    SELECT txn_id, order_id, status, merchant_id, amount, net_amount, charge_amount, callback_url
                    FROM payin_transactions
                    WHERE txn_id = %s AND pg_partner = 'MONEYONE'
                """, (client_id,))

                txn = cursor.fetchone()

                # Try by actual order_id if not found by txn_id
                if not txn:
                    cursor.execute("""
                        SELECT txn_id, order_id, status, merchant_id, amount, net_amount, charge_amount, callback_url
                        FROM payin_transactions
                        WHERE order_id = %s AND pg_partner = 'MONEYONE'
                    """, (client_id,))
                    txn = cursor.fetchone()

                # Try prefix match on txn_id if MoneyOne truncated the orderid
                if not txn and client_id:
                    cursor.execute("""
                        SELECT txn_id, order_id, status, merchant_id, amount, net_amount, charge_amount, callback_url
                        FROM payin_transactions
                        WHERE txn_id LIKE %s AND pg_partner = 'MONEYONE'
                        ORDER BY created_at DESC LIMIT 1
                    """, (client_id + '%',))
                    txn = cursor.fetchone()

                # Try to extract original txn_id from MoneyOne's payid (which often appends a timestamp)
                if not txn and payid:
                    cursor.execute("""
                        SELECT txn_id, order_id, status, merchant_id, amount, net_amount, charge_amount, callback_url
                        FROM payin_transactions
                        WHERE %s LIKE CONCAT(txn_id, '%%') AND pg_partner = 'MONEYONE'
                        ORDER BY created_at DESC LIMIT 1
                    """, (payid,))
                    txn = cursor.fetchone()

                if not txn:
                    print(f"ERROR: Transaction not found for id: {client_id}")
                    return jsonify({'success': False, 'message': 'Transaction not found'}), 404

                print(f"Found Transaction: {txn['txn_id']}, Current Status: {txn['status']}")

                if mapped_status == 'SUCCESS':
                    cursor.execute("""
                        SELECT COUNT(*) as count FROM merchant_wallet_transactions
                        WHERE reference_id = %s AND txn_type = 'UNSETTLED_CREDIT'
                    """, (txn['txn_id'],))

                    wallet_credit_exists = cursor.fetchone()['count'] > 0

                    if wallet_credit_exists:
                        print(f"⚠ Wallet already credited for this transaction - skipping wallet credit")
                        if txn['status'] != 'SUCCESS':
                            cursor.execute("""
                                UPDATE payin_transactions
                                SET status = %s, bank_ref_no = %s, pg_txn_id = %s, completed_at = NOW(), updated_at = NOW()
                                WHERE txn_id = %s
                            """, (mapped_status, operator_ref, payid, txn['txn_id']))
                            conn.commit()
                    else:
                        print(f"Processing SUCCESS callback - crediting unsettled wallet")

                        cursor.execute("""
                            UPDATE payin_transactions
                            SET status = %s, pg_txn_id = %s, bank_ref_no = %s, completed_at = NOW(), updated_at = NOW()
                            WHERE txn_id = %s
                        """, (mapped_status, payid, operator_ref, txn['txn_id']))

                        net_amount = float(txn['net_amount'])
                        charge_amount = float(txn['charge_amount'])

                        # Merchant Wallet
                        cursor.execute("""
                            SELECT unsettled_balance FROM merchant_wallet WHERE merchant_id = %s
                        """, (txn['merchant_id'],))
                        wallet_result = cursor.fetchone()

                        if wallet_result:
                            unsettled_before = float(wallet_result['unsettled_balance'])
                            unsettled_after = unsettled_before + net_amount
                            cursor.execute("""
                                UPDATE merchant_wallet
                                SET unsettled_balance = %s, last_updated = NOW()
                                WHERE merchant_id = %s
                            """, (unsettled_after, txn['merchant_id']))
                        else:
                            cursor.execute("""
                                INSERT INTO merchant_wallet (merchant_id, balance, settled_balance, unsettled_balance)
                                VALUES (%s, 0.00, 0.00, %s)
                            """, (txn['merchant_id'], net_amount))
                            unsettled_before = 0.00
                            unsettled_after = net_amount

                        from wallet_service import wallet_service
                        wallet_txn_id = wallet_service.generate_txn_id('MWT')

                        cursor.execute("""
                            INSERT INTO merchant_wallet_transactions
                            (merchant_id, txn_id, txn_type, amount, balance_before, balance_after, description, reference_id)
                            VALUES (%s, %s, 'UNSETTLED_CREDIT', %s, %s, %s, %s, %s)
                        """, (
                            txn['merchant_id'], wallet_txn_id, net_amount, unsettled_before, unsettled_after,
                            f"MoneyOne Payin credited to unsettled wallet - {client_id}", txn['txn_id']
                        ))

                        # Admin Wallet
                        cursor.execute("""
                            SELECT unsettled_balance FROM admin_wallet WHERE admin_id = 'admin'
                        """, ())
                        admin_wallet_result = cursor.fetchone()

                        if admin_wallet_result:
                            admin_unsettled_before = float(admin_wallet_result['unsettled_balance'])
                            admin_unsettled_after = admin_unsettled_before + charge_amount
                            cursor.execute("""
                                UPDATE admin_wallet
                                SET unsettled_balance = %s, last_updated = NOW()
                                WHERE admin_id = 'admin'
                            """, (admin_unsettled_after,))
                        else:
                            cursor.execute("""
                                INSERT IGNORE INTO admin_users (admin_id, password_hash, is_active)
                                VALUES ('admin', 'system_auto', FALSE)
                            """)
                            cursor.execute("""
                                INSERT INTO admin_wallet (admin_id, main_balance, unsettled_balance)
                                VALUES ('admin', 0.00, %s)
                            """, (charge_amount,))
                            admin_unsettled_before = 0.00
                            admin_unsettled_after = charge_amount

                        admin_wallet_txn_id = wallet_service.generate_txn_id('AWT')
                        cursor.execute("""
                            INSERT INTO admin_wallet_transactions
                            (admin_id, txn_id, txn_type, amount, balance_before, balance_after, description, reference_id)
                            VALUES (%s, %s, 'UNSETTLED_CREDIT', %s, %s, %s, %s, %s)
                        """, (
                            'admin', admin_wallet_txn_id, charge_amount, admin_unsettled_before, admin_unsettled_after,
                            f"MoneyOne Payin charge - {client_id}", txn['txn_id']
                        ))

                        conn.commit()
                        print(f"✓ Transaction updated to SUCCESS and wallets credited")

                elif mapped_status == 'FAILED':
                    cursor.execute("""
                        UPDATE payin_transactions
                        SET status = %s, pg_txn_id = %s, completed_at = NOW(), updated_at = NOW()
                        WHERE txn_id = %s
                    """, (mapped_status, payid, txn['txn_id']))
                    conn.commit()
                    print(f"✓ Transaction updated to FAILED")

                # Merchant Callback Forwarding
                callback_url = txn.get('callback_url')
                if not callback_url:
                    cursor.execute("""
                        SELECT payin_callback_url FROM merchant_callbacks WHERE merchant_id = %s
                    """, (txn['merchant_id'],))
                    merchant_callback_fallback = cursor.fetchone()
                    if merchant_callback_fallback and merchant_callback_fallback.get('payin_callback_url'):
                        callback_url = merchant_callback_fallback['payin_callback_url'].strip()

                if callback_url:
                    if 'api.moneyone.co.in' in callback_url or 'api.payflux.online' in callback_url:
                        print(f"⚠ Skipping callback forward - merchant callback URL is our own callback endpoint")
                    else:
                        import requests
                        merchant_callback_data = {
                            'txn_id': txn['txn_id'],
                            'order_id': txn['order_id'],
                            'status': mapped_status,
                            'amount': str(txn['amount']),
                            'net_amount': str(txn['net_amount']),
                            'charge_amount': str(txn['charge_amount']),
                            'utr': operator_ref or '',
                            'pg_txn_id': payid or '',
                            'payment_mode': 'UPI',
                            'pg_partner': 'Sudomoney',
                            'timestamp': datetime.now().isoformat()
                        }
                        try:
                            callback_response = requests.post(
                                callback_url, json=merchant_callback_data,
                                headers={'Content-Type': 'application/json'}, timeout=10
                            )
                            cursor.execute("""
                                INSERT INTO callback_logs 
                                (merchant_id, txn_id, callback_url, request_data, response_code, response_data, created_at)
                                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                            """, (
                                txn['merchant_id'], txn['txn_id'], callback_url,
                                json.dumps(merchant_callback_data), callback_response.status_code, callback_response.text[:1000]
                            ))
                            conn.commit()
                        except Exception as e:
                            print(f"ERROR: Failed to send merchant callback: {e}")
                            cursor.execute("""
                                INSERT INTO callback_logs 
                                (merchant_id, txn_id, callback_url, request_data, response_code, response_data, created_at)
                                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                            """, (
                                txn['merchant_id'], txn['txn_id'], callback_url,
                                json.dumps(merchant_callback_data), 0, str(e)[:1000]
                            ))
                            conn.commit()

                return jsonify({'success': True, 'message': 'Callback processed successfully'}), 200

        finally:
            conn.close()

    except Exception as e:
        print(f"ERROR in callback: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to process callback data.'}), 500

moneyone_payout_callback_bp = Blueprint('moneyone_payout_callback', __name__, url_prefix='/api/callback/moneyone')

@moneyone_payout_callback_bp.route('/payout', methods=['POST'])
def moneyone_payout_callback():
    """Handle Moneyone payout webhook"""
    try:
        from wallet_service import wallet_service
        # Handle raw json correctly
        if request.is_json:
            callback_data = request.get_json()
        else:
            try:
                callback_data = json.loads(request.data)
            except:
                callback_data = request.form.to_dict()

        if not callback_data:
            return jsonify({'success': False, 'message': 'No callback data provided'}), 400

        print(f"Moneyone Payout Callback Received: {json.dumps(callback_data)}")
        
        status = callback_data.get('status', 'QUEUED')
        
        # MoneyOne callback sends:
        # - reference_id: MoneyOne's internal reference (what we stored as pg_txn_id)
        # - order_id: Our original order_id (the DP prefix one we sent, which is our reference_id)
        # - txn_id: MoneyOne's transaction ID
        moneyone_reference_id = callback_data.get('reference_id')
        our_order_id = callback_data.get('order_id')
        utr = callback_data.get('utr', '')
        error_msg = callback_data.get('message', '')

        if not moneyone_reference_id and not our_order_id:
            return jsonify({'success': False, 'message': 'Missing reference_id and order_id in callback'}), 400

        status_map = {
            'SUCCESS': 'SUCCESS', 'COMPLETED': 'SUCCESS',
            'PENDING': 'QUEUED', 'INITIATED': 'QUEUED',
            'FAILED': 'FAILED', 'REJECTED': 'FAILED',
            'PROCESSING': 'INPROCESS', 'QUEUED': 'QUEUED'
        }
        
        mapped_status = status_map.get(status.upper(), 'QUEUED')

        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500

        try:
            with conn.cursor() as cursor:
                # Search 1: By pg_txn_id (MoneyOne's reference_id)
                cursor.execute("""
                    SELECT * FROM payout_transactions
                    WHERE pg_txn_id = %s AND pg_partner = 'MONEYONE'
                """, (moneyone_reference_id,))
                txn = cursor.fetchone()

                # Search 2: By reference_id (our order_id)
                if not txn and our_order_id:
                    cursor.execute("""
                        SELECT * FROM payout_transactions
                        WHERE reference_id = %s AND pg_partner = 'MONEYONE'
                    """, (our_order_id,))
                    txn = cursor.fetchone()
                    
                    if not txn:
                        return jsonify({'success': False, 'message': 'Transaction not found'}), 404

                # Skip if already in final state
                if txn['status'] in ['SUCCESS', 'FAILED']:
                    return jsonify({'success': True, 'message': 'Transaction already in final state'}), 200

                # Process state change
                if mapped_status == 'SUCCESS':
                    cursor.execute("""
                        UPDATE payout_transactions
                        SET status = %s, utr = %s, pg_txn_id = %s, completed_at = NOW(), updated_at = NOW()
                        WHERE txn_id = %s
                    """, (mapped_status, utr, moneyone_reference_id, txn['txn_id']))
                    conn.commit()

                elif mapped_status == 'FAILED':
                    # First update transaction status
                    cursor.execute("""
                        UPDATE payout_transactions
                        SET status = %s, utr = %s, error_message = %s, pg_txn_id = %s, completed_at = NOW(), updated_at = NOW()
                        WHERE txn_id = %s
                    """, (mapped_status, utr, error_msg, moneyone_reference_id, txn['txn_id']))
                    conn.commit()

                    # Refund logic
                    if txn['admin_id'] is None and txn['merchant_id']:
                        net_amount = float(txn['amount'])
                        charge_amount = float(txn['charge_amount'])
                        total_refund = net_amount + charge_amount

                        refund_result = wallet_service.credit_merchant_wallet(
                            txn['merchant_id'],
                            total_refund,
                            f"Refund for failed payout {txn['txn_id']} via Moneyone",
                            txn['txn_id'],
                            is_settled=True,
                            conn=conn
                        )
                        
                        if not refund_result['success']:
                            print(f"Failed to refund merchant for txn {txn['txn_id']}: {refund_result['message']}")

                else:
                    cursor.execute("""
                        UPDATE payout_transactions
                        SET status = %s, utr = %s, error_message = %s, pg_txn_id = %s, updated_at = NOW()
                        WHERE txn_id = %s
                    """, (mapped_status, utr, error_msg, moneyone_reference_id, txn['txn_id']))
                    conn.commit()

                # Send Webhook to Merchant
                if txn['callback_url'] and txn['merchant_id']:
                    import requests
                    webhook_data = {
                        'txn_id': txn['txn_id'],
                        'reference_id': txn['reference_id'],
                        'order_id': txn.get('order_id'),
                        'amount': float(txn['net_amount']),
                        'status': mapped_status,
                        'utr': utr,
                        'message': error_msg,
                        'pg_partner': 'Sudomoney'
                    }
                    try:
                        requests.post(txn['callback_url'], json=webhook_data, timeout=5)
                    except Exception as e:
                        print(f"Failed to send merchant webhook for txn {txn['txn_id']}: {str(e)}")

                return jsonify({'success': True, 'message': 'Callback processed successfully'}), 200

        finally:
            conn.close()

    except Exception as e:
        print(f"Moneyone Payout Callback Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500
