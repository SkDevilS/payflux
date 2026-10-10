"""
Paytm_Megacart Callback Routes
Handles webhook callbacks from Paytm Megacart UPI Intent payment gateway
"""

from flask import Blueprint, request, jsonify
from paytm_megacart_service import paytm_megacart_service
from database import get_db_connection
from datetime import datetime

paytm_megacart_callback_bp = Blueprint('paytm_megacart_callback', __name__, url_prefix='/api/callback/paytm_megacart')

# Support alias /paytmmegacart as well via url_prefix in app registration or second blueprint route
@paytm_megacart_callback_bp.route('/payin', methods=['POST'])
def payin_webhook():
    """
    Handle webhook callbacks from Paytm Megacart
    Paytm POSTs form-encoded key-value pairs (or JSON) when transaction reaches terminal state
    """
    try:
        data = request.form.to_dict()
        if not data:
            data = request.get_json(silent=True) or {}
        if not data and request.values:
            data = request.values.to_dict()

        if not data:
            return jsonify({'success': False, 'message': 'No data received'}), 400

        print(f"Received Paytm Megacart webhook | Form/JSON: {data} | Query Args: {request.args.to_dict()}")

        merchant_order_id = (data.get('ORDERID') or data.get('orderId') or request.args.get('ref') or '').strip()
        status_code = (data.get('STATUS') or data.get('status') or '').strip()
        paytm_txn_id = (data.get('TXNID') or data.get('transId') or '').strip()
        utr = (data.get('BANKTXNID') or data.get('utr') or '').strip()
        amount = data.get('TXNAMOUNT') or data.get('amount')
        checksum = (data.get('CHECKSUMHASH') or data.get('checksumHash') or '').strip()
        resp_msg = (data.get('RESPMSG') or data.get('respMsg') or '').strip()

        if not merchant_order_id:
            return jsonify({'success': False, 'message': 'Missing ORDERID'}), 400

        # Verify signature if checksum present
        if checksum:
            is_valid = paytm_megacart_service.verify_signature(data, paytm_megacart_service.merchant_key, checksum)
            # If Paytm signed URL query parameters along with form data, try verifying combined request.values
            if not is_valid and request.values:
                combined_data = request.values.to_dict()
                is_valid = paytm_megacart_service.verify_signature(combined_data, paytm_megacart_service.merchant_key, checksum)
            if not is_valid:
                print(f"Paytm Megacart Webhook Checksum Mismatch for order: {merchant_order_id}")
                return jsonify({'success': False, 'message': 'Invalid checksum'}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500

        try:
            with conn.cursor() as cursor:
                # Look up transaction by order_id or txn_id
                cursor.execute("""
                    SELECT txn_id, merchant_id, order_id, status, net_amount, charge_amount, callback_url, amount
                    FROM payin_transactions
                    WHERE (order_id = %s OR txn_id = %s) AND pg_partner = 'PAYTM_MEGACART'
                    ORDER BY created_at DESC
                    LIMIT 1
                """, (merchant_order_id, merchant_order_id))

                txn = cursor.fetchone()
                if not txn:
                    print(f"Transaction not found for ORDERID: {merchant_order_id}")
                    return jsonify({'success': False, 'message': 'Transaction not found'}), 404

                if txn['status'] in ['SUCCESS', 'FAILED']:
                    print(f"Transaction {txn['txn_id']} already processed with status {txn['status']}")
                    return jsonify({'success': True, 'message': 'Already processed'}), 200

                mapped_status = 'QUEUED'
                if status_code in ['TXN_SUCCESS', 'SUCCESS', 'S']:
                    mapped_status = 'SUCCESS'
                    cursor.execute("""
                        UPDATE payin_transactions
                        SET status = 'SUCCESS', bank_ref_no = %s, pg_txn_id = %s, payment_mode = 'UPI',
                            completed_at = NOW(), updated_at = NOW()
                        WHERE txn_id = %s
                    """, (utr, paytm_txn_id, txn['txn_id']))

                    cursor.execute("""
                        SELECT COUNT(*) as count FROM merchant_wallet_transactions
                        WHERE reference_id = %s AND txn_type = 'UNSETTLED_CREDIT'
                    """, (txn['txn_id'],))

                    if cursor.fetchone()['count'] == 0:
                        from wallet_service import wallet_service as wallet_svc
                        wallet_svc.credit_unsettled_wallet(
                            merchant_id=txn['merchant_id'],
                            amount=float(txn['net_amount']),
                            description=f"PayIn received (Paytm Megacart) - {txn['order_id']}",
                            reference_id=txn['txn_id']
                        )
                        wallet_svc.credit_admin_unsettled_wallet(
                            admin_id='admin',
                            amount=float(txn['charge_amount']),
                            description=f"PayIn charge (Paytm Megacart) - {txn['order_id']}",
                            reference_id=txn['txn_id']
                        )

                    conn.commit()

                elif status_code in ['TXN_FAILURE', 'FAILED', 'TXN_FAILURE_AUTO_REFUND']:
                    mapped_status = 'FAILED'
                    cursor.execute("""
                        UPDATE payin_transactions
                        SET status = 'FAILED', pg_txn_id = %s, completed_at = NOW(), updated_at = NOW()
                        WHERE txn_id = %s
                    """, (paytm_txn_id, txn['txn_id']))
                    conn.commit()

                # Send Webhook to Merchant in Thefoxes callback forwarding format
                if mapped_status in ['SUCCESS', 'FAILED']:
                    paytm_megacart_service.send_merchant_webhook(txn, txn['order_id'], mapped_status, utr, resp_msg)

                return jsonify({'success': True, 'message': 'Webhook processed'}), 200

        finally:
            conn.close()

    except Exception as e:
        print(f"Paytm Megacart webhook error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Internal server error'}), 500
