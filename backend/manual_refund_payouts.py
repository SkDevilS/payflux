import sys
import os
from database import get_db_connection
from wallet_service import wallet_service

def manual_refund(order_id_or_txn_id):
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database.")
        return

    try:
        with conn.cursor() as cursor:
            # 1. Fetch transaction
            cursor.execute("""
                SELECT txn_id, status, merchant_id, amount, charge_amount, order_id
                FROM payout_transactions
                WHERE order_id = %s OR txn_id = %s
            """, (order_id_or_txn_id, order_id_or_txn_id))
            
            txn = cursor.fetchone()
            if not txn:
                print(f"❌ Transaction not found for: {order_id_or_txn_id}")
                return

            txn_id = txn['txn_id']
            order_id = txn['order_id']
            merchant_id = txn['merchant_id']
            
            print(f"\nProcessing refund for Order ID: {order_id} | Txn ID: {txn_id} | Status: {txn['status']}")

            # 2. Check if the wallet was EVER debited for this payout
            cursor.execute("""
                SELECT COUNT(*) as count FROM merchant_wallet_transactions
                WHERE reference_id = %s AND txn_type = 'DEBIT'
            """, (txn_id,))
            debit_count = cursor.fetchone()['count']
            
            # 3. Check if already refunded
            cursor.execute("""
                SELECT COUNT(*) as count FROM merchant_wallet_transactions
                WHERE reference_id = %s AND txn_type = 'CREDIT'
            """, (txn_id,))
            credit_count = cursor.fetchone()['count']

            if debit_count == 0:
                print(f"⚠ Skipping: Transaction {order_id} was never debited from the wallet. No refund needed.")
                if txn['status'] != 'FAILED':
                    cursor.execute("""
                        UPDATE payout_transactions
                        SET status = 'FAILED', updated_at = NOW()
                        WHERE txn_id = %s
                    """, (txn_id,))
                    conn.commit()
                    print(f"  -> Updated status to FAILED.")
                return

            if credit_count > 0:
                print(f"⚠ Skipping: Transaction {order_id} is already refunded.")
                if txn['status'] != 'FAILED':
                    cursor.execute("""
                        UPDATE payout_transactions
                        SET status = 'FAILED', updated_at = NOW()
                        WHERE txn_id = %s
                    """, (txn_id,))
                    conn.commit()
                    print(f"  -> Updated status to FAILED.")
                return

            # 4. Mark as FAILED if not already
            if txn['status'] != 'FAILED':
                cursor.execute("""
                    UPDATE payout_transactions
                    SET status = 'FAILED', completed_at = NOW(), updated_at = NOW()
                    WHERE txn_id = %s
                """, (txn_id,))
            
            # 5. Process Refund
            total_deduction = float(txn['amount'])  # amount already includes charges
            print(f"💰 Refunding Total: {total_deduction} to Merchant: {merchant_id}")
            
            # Update balances
            cursor.execute("""
                UPDATE merchant_wallet
                SET balance = balance + %s, settled_balance = settled_balance + %s, last_updated = NOW()
                WHERE merchant_id = %s
            """, (total_deduction, total_deduction, merchant_id))
            
            # Get updated balance
            cursor.execute("SELECT balance, settled_balance FROM merchant_wallet WHERE merchant_id = %s", (merchant_id,))
            w_res = cursor.fetchone()
            
            # Insert wallet transaction
            wallet_txn_id = wallet_service.generate_txn_id('MWT')
            cursor.execute("""
                INSERT INTO merchant_wallet_transactions
                (merchant_id, txn_id, txn_type, amount, balance_before, balance_after, reference_id, description)
                VALUES (%s, %s, 'CREDIT', %s, %s, %s, %s, %s)
            """, (
                merchant_id, wallet_txn_id, total_deduction, 
                float(w_res['settled_balance']) - total_deduction, w_res['settled_balance'],
                txn_id, f"Manual refund for failed payout {txn_id}"
            ))
            
            conn.commit()
            print(f"✅ Successfully refunded {order_id}! New settled balance: {w_res['settled_balance']}")

    except Exception as e:
        print(f"❌ Error processing refund for {order_id_or_txn_id}: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python manual_refund_payouts.py <order_id_or_txn_id_1> <order_id_or_txn_id_2> ...")
        print("Example: python manual_refund_payouts.py SGP_TXN_5B117E746965 SGP_TXN_123456789")
        sys.exit(1)

    txns_to_refund = sys.argv[1:]
    for tx in txns_to_refund:
        manual_refund(tx)
