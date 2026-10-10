"""
Singpay Callback Routes
"""

from flask import Blueprint, request, Response
from database import get_db_connection
from singpay_service import singpay_service
from callback_forwarder import forward_payin_callback, forward_payout_callback
import json

singpay_callback_bp = Blueprint('singpay_callback', __name__, url_prefix='/api/callback')

@singpay_callback_bp.route('/singpay', methods=['POST'])
def singpay_universal_callback():
    try:
        if request.is_json:
            data = request.json
        else:
            data = request.form.to_dict()
            
        print("="*80)
        print("Singpay Universal Callback Received")
        print(f"Data: {json.dumps(data, indent=2)}")
        
        # Verify signature
        received_sign = data.get('sign')
        
        if received_sign:
            calculated_sign = singpay_service.generate_signature(data)
            if calculated_sign != received_sign:
                print("Signature validation failed")
                return Response("failure", status=400, mimetype="text/plain")
        else:
            print("No signature received")
            return Response("failure", status=400, mimetype="text/plain")
            
        status = str(data.get('status', ''))
        order_id = data.get('merchant_order_no')
        utr = data.get('utr')
        callback_type = str(data.get('type', '')).lower()
        
        if callback_type == 'pay':
            process_payin_callback(order_id, status, utr, data)
        elif callback_type == 'payout':
            process_payout_callback(order_id, status, utr, data)
        else:
            print(f"Unknown callback type: {callback_type}")
            
        return Response("success", mimetype="text/plain")
        
    except Exception as e:
        print(f"Error processing Singpay universal callback: {e}")
        import traceback
        traceback.print_exc()
        return Response(f"failure: {str(e)}", status=500, mimetype="text/plain")

@singpay_callback_bp.route('/singpay/payin', methods=['POST'])
def singpay_payin_callback():
    try:
        if request.is_json:
            data = request.json
        else:
            data = request.form.to_dict()
            
        print("="*80)
        print("Singpay Payin Callback Received")
        print(f"Data: {json.dumps(data, indent=2)}")
        
        # Verify signature
        received_sign = data.get('sign')
        
        if received_sign:
            calculated_sign = singpay_service.generate_signature(data)
            if calculated_sign != received_sign:
                print("Signature validation failed")
                return Response("failure", status=400, mimetype="text/plain")
        else:
            print("No signature received")
            return Response("failure", status=400, mimetype="text/plain")
            
        status = str(data.get('status', ''))
        order_id = data.get('merchant_order_no')
        utr = data.get('utr')
        
        process_payin_callback(order_id, status, utr, data)
            
        return Response("success", mimetype="text/plain")
        
    except Exception as e:
        print(f"Error processing Singpay payin callback: {e}")
        import traceback
        traceback.print_exc()
        return Response(f"failure: {str(e)}", status=500, mimetype="text/plain")

@singpay_callback_bp.route('/singpay/payout', methods=['POST'])
def singpay_payout_callback():
    try:
        if request.is_json:
            data = request.json
        else:
            data = request.form.to_dict()
            
        print("="*80)
        print("Singpay Payout Callback Received")
        print(f"Data: {json.dumps(data, indent=2)}")
        
        # Verify signature
        received_sign = data.get('sign')
        
        if received_sign:
            calculated_sign = singpay_service.generate_signature(data)
            if calculated_sign != received_sign:
                print("Signature validation failed")
                return Response("failure", status=400, mimetype="text/plain")
        else:
            print("No signature received")
            return Response("failure", status=400, mimetype="text/plain")
            
        status = str(data.get('status', ''))
        order_id = data.get('merchant_order_no')
        utr = data.get('utr')
        
        process_payout_callback(order_id, status, utr, data)
            
        return Response("success", mimetype="text/plain")
        
    except Exception as e:
        print(f"Error processing Singpay payout callback: {e}")
        import traceback
        traceback.print_exc()
        return Response("failure", status=500, mimetype="text/plain")

def process_payin_callback(order_id, status_code, utr, data):
    mapped_status = 'INITIATED'
    if str(status_code).lower() == 'success':
        mapped_status = 'SUCCESS'
    elif str(status_code).lower() in ['failed', 'refunded']:
        mapped_status = 'FAILED'
        
    conn = get_db_connection()
    if not conn:
        return
        
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT txn_id, status, merchant_id, amount as txn_amount, order_id, net_amount, charge_amount, callback_url, bank_ref_no
                FROM payin_transactions
                WHERE order_id = %s OR txn_id = %s
            """, (order_id, order_id))
            
            txn = cursor.fetchone()
            if not txn:
                print(f"Transaction not found for {order_id}")
                return
                
            if mapped_status == 'SUCCESS' and txn['status'] != 'SUCCESS':
                # Check for duplicate wallet credit
                cursor.execute("""
                    SELECT COUNT(*) as count FROM merchant_wallet_transactions
                    WHERE reference_id = %s AND txn_type = 'UNSETTLED_CREDIT'
                """, (txn['txn_id'],))
                if cursor.fetchone()['count'] == 0:
                    cursor.execute("""
                        UPDATE payin_transactions
                        SET status = %s, bank_ref_no = %s, pg_txn_id = %s, payment_mode = 'UPI', completed_at = NOW(), updated_at = NOW()
                        WHERE txn_id = %s
                    """, (mapped_status, utr, data.get('order_no', ''), txn['txn_id']))
                    
                    net_amount = float(txn['net_amount'])
                    
                    cursor.execute("""
                        UPDATE merchant_wallet
                        SET unsettled_balance = unsettled_balance + %s, last_updated = NOW()
                        WHERE merchant_id = %s
                    """, (net_amount, txn['merchant_id']))
                    if cursor.rowcount == 0:
                        cursor.execute("""
                            INSERT INTO merchant_wallet (merchant_id, balance, settled_balance, unsettled_balance)
                            VALUES (%s, 0.00, 0.00, %s)
                        """, (txn['merchant_id'], net_amount))
                        
                    cursor.execute("SELECT balance, unsettled_balance FROM merchant_wallet WHERE merchant_id = %s", (txn['merchant_id'],))
                    w_res = cursor.fetchone()
                    
                    from wallet_service import wallet_service
                    wallet_txn_id = wallet_service.generate_txn_id('MWT')
                    
                    cursor.execute("""
                        INSERT INTO merchant_wallet_transactions 
                        (merchant_id, txn_id, txn_type, amount, balance_before, balance_after, description, reference_id)
                        VALUES (%s, %s, 'UNSETTLED_CREDIT', %s, %s, %s, %s, %s)
                    """, (
                        txn['merchant_id'], wallet_txn_id, net_amount, 
                        float(w_res['unsettled_balance']) - net_amount, w_res['unsettled_balance'],
                        f"Payin credit for {txn['order_id']} via Singpay", txn['txn_id']
                    ))
                    conn.commit()
                    print(f"Processed SUCCESS payin for {order_id}")
                    
            elif mapped_status == 'FAILED' and txn['status'] != 'FAILED':
                cursor.execute("""
                    UPDATE payin_transactions
                    SET status = %s, bank_ref_no = %s, pg_txn_id = %s, completed_at = NOW(), updated_at = NOW()
                    WHERE txn_id = %s
                """, (mapped_status, utr, data.get('order_no', ''), txn['txn_id']))
                conn.commit()
                print(f"Processed FAILED payin for {order_id}")
                
            elif mapped_status == 'SUCCESS' and txn['status'] == 'SUCCESS':
                # Update UTR if transaction is already success but missing UTR
                if utr and not txn.get('bank_ref_no'):
                    cursor.execute("""
                        UPDATE payin_transactions
                        SET bank_ref_no = %s, pg_txn_id = %s, updated_at = NOW()
                        WHERE txn_id = %s
                    """, (utr, data.get('order_no', ''), txn['txn_id']))
                    conn.commit()
                    print(f"Updated UTR for already SUCCESS payin {order_id}")
                
            # Forward callback to merchant
            merchant_callback_url = txn.get('callback_url')
            if not merchant_callback_url:
                # Try to get from merchant_callbacks table (Airpay style fallback)
                cursor.execute("""
                    SELECT payin_callback_url
                    FROM merchant_callbacks
                    WHERE merchant_id = %s
                """, (txn['merchant_id'],))
                
                callback_config = cursor.fetchone()
                if callback_config and callback_config['payin_callback_url']:
                    merchant_callback_url = callback_config['payin_callback_url']
                    
            if merchant_callback_url:
                from datetime import datetime
                merchant_callback_data = {
                    'txn_id': txn['txn_id'],
                    'order_id': txn['order_id'],
                    'status': mapped_status,
                    'amount': str(txn['txn_amount']),
                    'net_amount': str(txn['net_amount']),
                    'charge_amount': str(txn['charge_amount']),
                    'utr': utr,
                    'pg_txn_id': data.get('order_no', order_id),
                    'payment_mode': 'UPI',
                    'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }
                forward_payin_callback(txn['txn_id'], txn['merchant_id'], merchant_callback_url, merchant_callback_data)
            
    finally:
        conn.close()

def process_payout_callback(order_id, status_code, utr, data):
    mapped_status = 'PROCESSING'
    if str(status_code).lower() == 'success':
        mapped_status = 'SUCCESS'
    elif str(status_code).lower() in ['failed', 'refunded']:
        mapped_status = 'FAILED'
        
    conn = get_db_connection()
    if not conn:
        return
        
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT txn_id, status, merchant_id, amount, charge_amount, callback_url, reference_id, order_id, utr
                FROM payout_transactions
                WHERE order_id = %s OR txn_id = %s
            """, (order_id, order_id))
            
            txn = cursor.fetchone()
            if not txn:
                print(f"Payout Transaction not found for {order_id}")
                return
                
            if mapped_status == 'SUCCESS' and txn['status'] != 'SUCCESS':
                # First, acquire a lock to prevent race conditions
                cursor.execute("SELECT settled_balance FROM merchant_wallet WHERE merchant_id = %s FOR UPDATE", (txn['merchant_id'],))
                wallet_row = cursor.fetchone()
                
                if wallet_row:
                    # Check if it was ever debited
                    cursor.execute("""
                        SELECT COUNT(*) as count FROM merchant_wallet_transactions
                        WHERE reference_id = %s AND txn_type = 'DEBIT'
                    """, (txn['txn_id'],))
                    debit_count = cursor.fetchone()['count']
                    
                    if debit_count == 0:
                        from wallet_service import WalletService
                        wallet_svc = WalletService()
                        total_deduction = float(txn['amount'])  # txn['amount'] already includes charges
                        
                        debit_result = wallet_svc.debit_merchant_wallet(
                            merchant_id=txn['merchant_id'],
                            amount=total_deduction,
                            description=f"Payout completed {txn['txn_id']}",
                            reference_id=txn['txn_id']
                        )
                        if not debit_result['success']:
                            print(f"Failed to debit wallet for SUCCESS payout {txn['txn_id']}: {debit_result['message']}")
                        else:
                            print(f"Deducted wallet for SUCCESS payout {txn['txn_id']} via callback.")

                cursor.execute("""
                    UPDATE payout_transactions
                    SET status = %s, utr = %s, pg_txn_id = %s, completed_at = NOW(), updated_at = NOW()
                    WHERE txn_id = %s
                """, (mapped_status, utr, data.get('order_no', ''), txn['txn_id']))
                conn.commit()
                print(f"Processed SUCCESS payout for {order_id}")
                
            elif mapped_status == 'FAILED':
                print(f"Payout callback received FAILED for {order_id}. Current DB status: {txn['status']}")
                
                # First, acquire a lock to prevent race conditions
                cursor.execute("SELECT settled_balance FROM merchant_wallet WHERE merchant_id = %s FOR UPDATE", (txn['merchant_id'],))
                wallet_row = cursor.fetchone()
                
                if wallet_row:
                    # 1. Check if the wallet was EVER debited for this payout
                    cursor.execute("""
                        SELECT COUNT(*) as count FROM merchant_wallet_transactions
                        WHERE reference_id = %s AND txn_type = 'DEBIT'
                    """, (txn['txn_id'],))
                    debit_count = cursor.fetchone()['count']
                    
                    # 2. Check if the wallet was ALREADY refunded for this payout
                    cursor.execute("""
                        SELECT COUNT(*) as count FROM merchant_wallet_transactions
                        WHERE reference_id = %s AND txn_type = 'CREDIT'
                    """, (txn['txn_id'],))
                    credit_count = cursor.fetchone()['count']
                    
                    if debit_count > 0 and credit_count == 0:
                        print(f"Proceeding with refund for {order_id}...")
                        total_deduction = float(txn['amount'])  # txn['amount'] already includes charges
                        
                        cursor.execute("""
                            UPDATE merchant_wallet
                            SET balance = balance + %s, settled_balance = settled_balance + %s, last_updated = NOW()
                            WHERE merchant_id = %s
                        """, (total_deduction, total_deduction, txn['merchant_id']))
                        
                        cursor.execute("SELECT balance, settled_balance FROM merchant_wallet WHERE merchant_id = %s", (txn['merchant_id'],))
                        w_res = cursor.fetchone()
                        
                        from wallet_service import WalletService
                        wallet_svc = WalletService()
                        wallet_txn_id = wallet_svc.generate_txn_id('MWT')
                        
                        cursor.execute("""
                            INSERT INTO merchant_wallet_transactions
                            (merchant_id, txn_id, txn_type, amount, balance_before, balance_after, reference_id, description)
                            VALUES (%s, %s, 'CREDIT', %s, %s, %s, %s, %s)
                        """, (
                            txn['merchant_id'], wallet_txn_id, total_deduction, 
                            float(w_res['settled_balance']) - total_deduction, w_res['settled_balance'],
                            txn['txn_id'], f"Refund for failed payout {txn['txn_id']}"
                        ))
                        print(f"Refunded {total_deduction} successfully for {order_id}.")
                    else:
                        print(f"Skipping refund for {order_id}. Debit count: {debit_count}, Credit count: {credit_count}")

                if txn['status'] != 'FAILED':
                    cursor.execute("""
                        UPDATE payout_transactions
                        SET status = %s, utr = %s, pg_txn_id = %s, completed_at = NOW(), updated_at = NOW()
                        WHERE txn_id = %s
                    """, (mapped_status, utr, data.get('order_no', ''), txn['txn_id']))
                    conn.commit()
                    print(f"Updated status to FAILED for payout {order_id}")
                else:
                    print(f"Payout {order_id} is already marked FAILED. Skipping status update.")
                
            elif mapped_status == 'SUCCESS' and txn['status'] == 'SUCCESS':
                # Update UTR if transaction is already success but missing UTR
                if utr and not txn.get('utr'):
                    cursor.execute("""
                        UPDATE payout_transactions
                        SET utr = %s, pg_txn_id = %s, updated_at = NOW()
                        WHERE txn_id = %s
                    """, (utr, data.get('order_no', ''), txn['txn_id']))
                    conn.commit()
                    print(f"Updated UTR for already SUCCESS payout {order_id}")
                
            merchant_callback_url = txn.get('callback_url')
            if not merchant_callback_url:
                cursor.execute("""
                    SELECT payout_callback_url
                    FROM merchant_callbacks
                    WHERE merchant_id = %s
                """, (txn['merchant_id'],))
                callback_config = cursor.fetchone()
                if callback_config and callback_config['payout_callback_url']:
                    merchant_callback_url = callback_config['payout_callback_url']
                    
            if merchant_callback_url:
                merchant_callback_data = {
                    "txn_id": txn['txn_id'],
                    "order_id": txn.get('order_id', order_id),
                    "reference_id": txn.get('reference_id', ''),
                    "amount": float(txn['amount']) - float(txn['charge_amount'] or 0),
                    "status": mapped_status,
                    "utr": utr,
                    "message": "Payout Successful" if mapped_status == 'SUCCESS' else f"Payout {mapped_status.capitalize()}"
                }
                forward_payout_callback(txn['txn_id'], txn['merchant_id'], merchant_callback_url, merchant_callback_data)
                
    finally:
        conn.close()
