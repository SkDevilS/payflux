"""
PayU2 PayIn Webhook and Callback Routes
Handles PayU2 S2S Intent UPI payment callbacks, status updates, and wallet crediting.
"""

from flask import Blueprint, request, jsonify
from database import get_db_connection
from payu2_service import payu2_service
import json

payu2_callback_bp = Blueprint('payu2_callback', __name__, url_prefix='/api/payin/callback/payu2')

def process_payu2_callback(payload):
    """
    Common handler to process PayU2 callback data from webhook, SURL, or FURL.
    """
    txn_id = payload.get('txnid')
    if not txn_id:
        return jsonify({'success': False, 'message': 'Transaction ID missing'}), 400
    
    # Verify hash
    if not payu2_service.verify_webhook_hash(payload):
        print(f"PayU2 Callback Security Warning: Invalid hash for {txn_id}")
        # Note: In sandbox/test mode some merchants may skip strict check, but enforce if configured
        if not payu2_service.test_mode:
            return jsonify({'success': False, 'message': 'Invalid signature'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed'}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT txn_id, merchant_id, order_id, amount, charge_amount, net_amount, status, callback_url
                FROM payin_transactions
                WHERE txn_id = %s
            """, (txn_id,))
            
            txn = cursor.fetchone()
            if not txn:
                print(f"PayU2 Callback Error: Transaction not found {txn_id}")
                return jsonify({'success': False, 'message': 'Transaction not found'}), 404
            
            payu_status = payload.get('status', '').lower()
            bank_ref_num = payload.get('bank_ref_num', '')
            mihpayid = payload.get('mihpayid', '')
            payment_mode = payload.get('mode', 'UPI')
            
            if payu_status == 'success':
                mapped_status = 'SUCCESS'
            elif payu_status == 'failure':
                mapped_status = 'FAILED'
            else:
                mapped_status = 'PENDING'
            
            print(f"PayU2 Callback for {txn_id}: PayU status='{payu_status}', mapped='{mapped_status}', current='{txn['status']}'")
            
            if mapped_status == 'SUCCESS':
                # Check if wallet already credited (idempotency check)
                cursor.execute("""
                    SELECT COUNT(*) as count FROM merchant_wallet_transactions
                    WHERE reference_id = %s AND txn_type = 'UNSETTLED_CREDIT'
                """, (txn_id,))
                
                wallet_already_credited = cursor.fetchone()['count'] > 0
                
                if txn['status'] != 'SUCCESS':
                    cursor.execute("""
                        UPDATE payin_transactions
                        SET status = 'SUCCESS',
                            bank_ref_no = %s,
                            pg_txn_id = %s,
                            payment_mode = %s,
                            completed_at = NOW(),
                            updated_at = NOW()
                        WHERE txn_id = %s
                    """, (bank_ref_num, mihpayid, payment_mode, txn_id))
                    
                    conn.commit()
                    print(f"✓ PayU2 transaction {txn_id} marked as SUCCESS")
                
                if not wallet_already_credited:
                    from wallet_service import wallet_service as wallet_svc
                    # Credit merchant unsettled wallet
                    wallet_res = wallet_svc.credit_unsettled_wallet(
                        merchant_id=txn['merchant_id'],
                        amount=float(txn['net_amount']),
                        description=f"PayIn received (PayU2) - {txn['order_id']}",
                        reference_id=txn_id
                    )
                    # Credit admin unsettled wallet
                    admin_res = wallet_svc.credit_admin_unsettled_wallet(
                        admin_id='admin',
                        amount=float(txn['charge_amount']),
                        description=f"PayIn charge (PayU2) - {txn['order_id']}",
                        reference_id=txn_id
                    )
                    print(f"✓ Wallet credit status: Merchant={wallet_res.get('success')}, Admin={admin_res.get('success')}")
                else:
                    print(f"⚠ PayU2 Transaction {txn_id} wallet already credited - skipping duplicate credit")
                
                # Send merchant callback notification
                txn_data = {
                    'txn_id': txn_id,
                    'order_id': txn['order_id'],
                    'amount': float(txn['amount']),
                    'status': 'SUCCESS',
                    'pg_txn_id': mihpayid,
                    'bank_ref_no': bank_ref_num,
                    'payment_mode': payment_mode
                }
                payu2_service.send_callback_notification(txn['merchant_id'], txn_data)
                
                # Also notify transaction-specific callback_url if present
                if txn.get('callback_url'):
                    try:
                        import requests
                        from datetime import datetime
                        requests.post(
                            txn['callback_url'],
                            json={
                                'txn_id': txn_id,
                                'order_id': txn['order_id'],
                                'amount': str(txn['amount']),
                                'status': 'SUCCESS',
                                'utr': bank_ref_num,
                                'pg_txn_id': mihpayid,
                                'timestamp': datetime.now().isoformat()
                            },
                            timeout=10
                        )
                    except Exception as ce:
                        print(f"Error calling transaction callback url: {ce}")
            
            elif mapped_status == 'FAILED' and txn['status'] != 'FAILED':
                cursor.execute("""
                    UPDATE payin_transactions
                    SET status = 'FAILED',
                        bank_ref_no = %s,
                        pg_txn_id = %s,
                        payment_mode = %s,
                        completed_at = NOW(),
                        updated_at = NOW()
                    WHERE txn_id = %s
                """, (bank_ref_num, mihpayid, payment_mode, txn_id))
                
                conn.commit()
                print(f"✗ PayU2 transaction {txn_id} marked as FAILED")
                
                txn_data = {
                    'txn_id': txn_id,
                    'order_id': txn['order_id'],
                    'amount': float(txn['amount']),
                    'status': 'FAILED',
                    'pg_txn_id': mihpayid,
                    'bank_ref_no': bank_ref_num,
                    'payment_mode': payment_mode
                }
                payu2_service.send_callback_notification(txn['merchant_id'], txn_data)

            return jsonify({'success': True, 'status': mapped_status, 'message': 'Callback processed'}), 200

    except Exception as e:
        print(f"PayU2 callback processing error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()

@payu2_callback_bp.route('/webhook', methods=['POST', 'GET'])
def payu2_webhook():
    """Server-to-Server Webhook handler for PayU2"""
    payload = request.form.to_dict() if request.form else request.get_json(silent=True) or {}
    if not payload and request.args:
        payload = request.args.to_dict()
    print(f"PayU2 Webhook received: {json.dumps(payload, default=str)}")
    return process_payu2_callback(payload)

@payu2_callback_bp.route('', methods=['POST', 'GET'])
def payu2_webhook_root():
    """Fallback handler if webhook URL is configured without /webhook"""
    payload = request.form.to_dict() if request.form else request.get_json(silent=True) or {}
    if not payload and request.args:
        payload = request.args.to_dict()
    print(f"PayU2 Webhook (root) received: {json.dumps(payload, default=str)}")
    return process_payu2_callback(payload)

@payu2_callback_bp.route('/success', methods=['POST', 'GET'])
def payu2_return_success():
    """SURL return route for PayU2"""
    payload = request.form.to_dict() if request.form else request.get_json(silent=True) or {}
    if not payload and request.args:
        payload = request.args.to_dict()
    print(f"PayU2 SURL (success return) received: {json.dumps(payload, default=str)}")
    if payload and payload.get('txnid'):
        process_payu2_callback(payload)
    return jsonify({'status': 'SUCCESS', 'message': 'Payment successful return url handled'}), 200

@payu2_callback_bp.route('/failure', methods=['POST', 'GET'])
def payu2_return_failure():
    """FURL return route for PayU2"""
    payload = request.form.to_dict() if request.form else request.get_json(silent=True) or {}
    if not payload and request.args:
        payload = request.args.to_dict()
    print(f"PayU2 FURL (failure return) received: {json.dumps(payload, default=str)}")
    if payload and payload.get('txnid'):
        process_payu2_callback(payload)
    return jsonify({'status': 'FAILED', 'message': 'Payment failure return url handled'}), 200
