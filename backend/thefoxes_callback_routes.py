"""
Thefoxes Callback Routes
Handles webhooks from Thefoxes payment gateway
"""

from flask import Blueprint, request, jsonify
from thefoxes_service import thefoxes_service
from database import get_db_connection
from datetime import datetime

thefoxes_callback_bp = Blueprint('thefoxes_callback', __name__, url_prefix='/api/callback/thefoxes')

@thefoxes_callback_bp.route('/payin', methods=['POST'])
def payin_webhook():
    """Handle webhook callbacks from Thefoxes"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'message': 'No data received'}), 400
            
        print(f"Received Thefoxes webhook: {data}")
        
        status_code = data.get('status')
        merchant_order_id = data.get('merchant_order_id')
        thefoxes_txn_id = data.get('transaction_id')
        utr = data.get('utr')
        amount = data.get('amount')
        
        if not merchant_order_id:
            return jsonify({'success': False, 'message': 'Missing order ID'}), 400
            
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
            
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT txn_id, merchant_id, status, net_amount, charge_amount, callback_url, amount, order_id
                    FROM payin_transactions
                    WHERE order_id = %s AND pg_partner = 'THEFOXES'
                """, (merchant_order_id,))
                
                txn = cursor.fetchone()
                
                if not txn:
                    print(f"Transaction not found for order_id: {merchant_order_id}")
                    return jsonify({'success': False, 'message': 'Transaction not found'}), 404
                    
                if txn['status'] in ['SUCCESS', 'FAILED']:
                    print(f"Transaction {txn['txn_id']} already processed with status {txn['status']}")
                    return jsonify({'success': True, 'message': 'Already processed'}), 200
                    
                mapped_status = 'QUEUED'
                if status_code == 'success':
                    mapped_status = 'SUCCESS'
                    cursor.execute("""
                        UPDATE payin_transactions
                        SET status = 'SUCCESS', bank_ref_no = %s, pg_txn_id = %s, payment_mode = 'UPI',
                            completed_at = NOW(), updated_at = NOW()
                        WHERE txn_id = %s
                    """, (utr, thefoxes_txn_id, txn['txn_id']))
                    
                    cursor.execute("""
                        SELECT COUNT(*) as count FROM merchant_wallet_transactions
                        WHERE reference_id = %s AND txn_type = 'UNSETTLED_CREDIT'
                    """, (txn['txn_id'],))
                    
                    if cursor.fetchone()['count'] == 0:
                        from wallet_service import wallet_service as wallet_svc
                        wallet_svc.credit_unsettled_wallet(
                            merchant_id=txn['merchant_id'],
                            amount=float(txn['net_amount']),
                            description=f"PayIn received (Thefoxes) - {merchant_order_id}",
                            reference_id=txn['txn_id']
                        )
                        wallet_svc.credit_admin_unsettled_wallet(
                            admin_id='admin',
                            amount=float(txn['charge_amount']),
                            description=f"PayIn charge (Thefoxes) - {merchant_order_id}",
                            reference_id=txn['txn_id']
                        )
                    
                    conn.commit()
                    
                elif status_code == 'failed':
                    mapped_status = 'FAILED'
                    cursor.execute("""
                        UPDATE payin_transactions
                        SET status = 'FAILED', pg_txn_id = %s, completed_at = NOW(), updated_at = NOW()
                        WHERE txn_id = %s
                    """, (thefoxes_txn_id, txn['txn_id']))
                    conn.commit()
                    
                # Send Webhook to Merchant
                if txn.get('callback_url') and txn.get('merchant_id'):
                    import requests
                    webhook_data = {
                        'txn_id': txn['txn_id'],
                        'reference_id': merchant_order_id,
                        'amount': float(txn['amount']) if txn.get('amount') else 0.0,
                        'status': mapped_status,
                        'utr': utr or '',
                        'message': data.get('message', ''),
                        'pg_partner': 'THEFOXES'
                    }
                    
                    if str(txn['merchant_id']) == '7894560001':
                        webhook_data['order_id'] = merchant_order_id

                    try:
                        requests.post(txn['callback_url'], json=webhook_data, timeout=5)
                    except Exception as e:
                        print(f"Failed to send merchant webhook for txn {txn['txn_id']}: {str(e)}")

                return jsonify({'success': True, 'message': 'Webhook processed'}), 200
                
        finally:
            conn.close()
            
    except Exception as e:
        print(f"Thefoxes webhook error: {e}")
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

@thefoxes_callback_bp.route('/payout', methods=['POST'])
def thefoxes_payout_callback():
    """Handle Thefoxes payout webhook"""
    try:
        if request.is_json:
            callback_data = request.get_json()
        else:
            import json
            try:
                callback_data = json.loads(request.data)
            except:
                callback_data = request.form.to_dict()

        if not callback_data:
            return jsonify({'success': False, 'message': 'No callback data provided'}), 400

        print(f"Thefoxes Payout Callback Received: {callback_data}")
        
        status = callback_data.get('status', 'pending')
        order_id = callback_data.get('order_id')
        transaction_id = callback_data.get('transaction_id')
        utr = callback_data.get('utr', '')
        error_msg = callback_data.get('message', '')
        amount = callback_data.get('amount')

        if not transaction_id and not order_id:
            return jsonify({'success': False, 'message': 'Missing reference_id and order_id in callback'}), 400

        status_map = {
            'success': 'SUCCESS',
            'pending': 'QUEUED',
            'failed': 'FAILED'
        }
        
        mapped_status = status_map.get(status.lower(), 'QUEUED')

        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500

        try:
            with conn.cursor() as cursor:
                # Search 1: By pg_txn_id
                cursor.execute("""
                    SELECT txn_id, status, merchant_id, admin_id, reference_id, amount, net_amount, charge_amount, callback_url, order_id
                    FROM payout_transactions
                    WHERE pg_txn_id = %s AND pg_partner = 'THEFOXES'
                """, (transaction_id,))
                txn = cursor.fetchone()

                # Search 2: By reference_id (order_id)
                if not txn and order_id:
                    cursor.execute("""
                        SELECT txn_id, status, merchant_id, admin_id, reference_id, amount, net_amount, charge_amount, callback_url, order_id
                        FROM payout_transactions
                        WHERE reference_id = %s AND pg_partner = 'THEFOXES'
                    """, (order_id,))
                    txn = cursor.fetchone()
                    
                if not txn:
                    return jsonify({'success': False, 'message': 'Transaction not found'}), 404


                # Process state change
                if mapped_status == 'SUCCESS':
                    cursor.execute("""
                        UPDATE payout_transactions
                        SET status = %s, utr = %s, pg_txn_id = %s, completed_at = NOW(), updated_at = NOW()
                        WHERE txn_id = %s
                    """, (mapped_status, utr, transaction_id, txn['txn_id']))
                    conn.commit()

                elif mapped_status == 'FAILED':
                    # First update transaction status
                    cursor.execute("""
                        UPDATE payout_transactions
                        SET status = %s, utr = %s, error_message = %s, pg_txn_id = %s, completed_at = NOW(), updated_at = NOW()
                        WHERE txn_id = %s
                    """, (mapped_status, utr, error_msg, transaction_id, txn['txn_id']))
                    conn.commit()

                    # Refund logic
                    if txn['merchant_id']:
                        cursor.execute("""
                            SELECT txn_id FROM merchant_wallet_transactions
                            WHERE reference_id = %s AND txn_type = 'CREDIT'
                            AND description LIKE '%%Payout refund%%'
                        """, (txn['txn_id'],))
                        
                        if not cursor.fetchone():
                            from wallet_service import wallet_service
                            total_refund = float(txn['amount'])
                            refund_result = wallet_service.credit_merchant_wallet(
                                txn['merchant_id'],
                                total_refund,
                                f"Payout refund: ₹{txn['net_amount']} + Charges: ₹{txn['charge_amount']}",
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
                    """, (mapped_status, utr, error_msg, transaction_id, txn['txn_id']))
                    conn.commit()

                # Send Webhook to Merchant
                if txn['callback_url'] and txn['merchant_id']:
                    import requests
                    import json
                    webhook_data = {
                        'txn_id': txn['txn_id'],
                        'reference_id': txn['reference_id'],
                        'amount': float(txn['net_amount']),
                        'status': mapped_status,
                        'utr': utr,
                        'message': error_msg,
                        'pg_partner': 'THEFOXES'
                    }
                    
                    # Add order_id specifically for this merchant
                    if str(txn['merchant_id']) == '7894560001':
                        webhook_data['order_id'] = txn.get('order_id')

                    try:
                        callback_response = requests.post(
                            txn['callback_url'],
                            json=webhook_data,
                            headers={'Content-Type': 'application/json'},
                            timeout=5
                        )
                        
                        cursor.execute("""
                            INSERT INTO callback_logs 
                            (merchant_id, txn_id, callback_url, request_data, response_code, response_data, created_at)
                            VALUES (%s, %s, %s, %s, %s, %s, NOW())
                        """, (
                            txn['merchant_id'],
                            txn['txn_id'],
                            txn['callback_url'],
                            json.dumps(webhook_data),
                            callback_response.status_code,
                            callback_response.text[:1000]
                        ))
                        conn.commit()
                    except Exception as e:
                        print(f"Failed to send merchant webhook for txn {txn['txn_id']}: {str(e)}")

                return jsonify({'success': True, 'message': 'Callback processed successfully'}), 200

        finally:
            conn.close()

    except Exception as e:
        print(f"Thefoxes Payout Callback Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500
