import sys
import os
import uuid
from datetime import datetime

# Make sure we can import from backend
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import get_db_connection

def add_admin_fund_direct(amount):
    conn = get_db_connection()
    if not conn:
        print("❌ Database connection failed")
        return False
        
    try:
        with conn.cursor() as cursor:
            # Get a valid admin_id
            cursor.execute("SELECT admin_id FROM admin_users LIMIT 1")
            admin_user = cursor.fetchone()
            if not admin_user:
                print("❌ No admin users found in database.")
                return False
            valid_admin_id = admin_user['admin_id']
            
            # 1. Calculate current admin balance dynamically as dashboard does
            cursor.execute("""
                SELECT COALESCE(SUM(amount), 0) as total_payin
                FROM payin_transactions
                WHERE status = 'SUCCESS'
            """)
            total_payin = float(cursor.fetchone()['total_payin'])
            
            cursor.execute("""
                SELECT COALESCE(SUM(amount), 0) as total_fetch
                FROM merchant_wallet_transactions
                WHERE txn_type = 'DEBIT' 
                AND description LIKE '%fetched by admin%'
            """)
            total_fetch = float(cursor.fetchone()['total_fetch'])
            
            cursor.execute("""
                SELECT COALESCE(SUM(amount), 0) as total_topup
                FROM fund_requests
                WHERE status = 'APPROVED'
            """)
            total_topup = float(cursor.fetchone()['total_topup'])
            
            cursor.execute("""
                SELECT COALESCE(SUM(amount), 0) as total_settlements
                FROM payout_transactions
                WHERE status IN ('SUCCESS', 'QUEUED')
                AND reference_id LIKE 'ADMIN%'
            """)
            total_settlements = float(cursor.fetchone()['total_settlements'])
            
            cursor.execute("""
                SELECT unsettled_balance
                FROM admin_wallet
                WHERE admin_id = %s
            """, (valid_admin_id,))
            admin_wallet_row = cursor.fetchone()
            admin_unsettled = float(admin_wallet_row['unsettled_balance']) if admin_wallet_row else 0.00
            
            cursor.execute("""
                SELECT 
                    COALESCE(SUM(
                        CASE 
                            WHEN txn_type = 'CREDIT' THEN amount
                            WHEN txn_type = 'DEBIT' THEN -amount
                            ELSE 0
                        END
                    ), 0) as total_adjustments
                FROM admin_wallet_transactions
                WHERE description LIKE '%Manual balance%'
                OR description LIKE '%Balance adjustment%'
                OR description LIKE '%Initial capital%'
            """)
            total_adjustments = float(cursor.fetchone()['total_adjustments'])
            
            current_balance = total_payin + total_fetch + admin_unsettled - total_topup - total_settlements + total_adjustments
            new_balance = current_balance + amount
            
            print(f"Current Admin Balance: {current_balance:,.2f}")
            print(f"Amount to Add: {amount:,.2f}")
            print(f"New Admin Balance will be: {new_balance:,.2f}")
            
            # 2. Insert into admin_wallet_transactions
            awt_id = f"AWT{datetime.now().strftime('%Y%m%d%H%M%S%f')[:17]}"
            
            cursor.execute("""
                INSERT INTO admin_wallet_transactions 
                (admin_id, txn_id, txn_type, amount, balance_before, balance_after, 
                 description, reference_id, created_at)
                VALUES (%s, %s, 'CREDIT', %s, %s, %s, %s, %s, NOW())
            """, (
                valid_admin_id,
                awt_id, 
                amount, 
                current_balance, 
                new_balance, 
                f"Manual balance adjustment - direct fund addition", 
                f"FUND_ADD_{uuid.uuid4().hex[:8].upper()}"
            ))
            
            conn.commit()
            print("✅ Successfully added funds to Admin Wallet without touching payin or merchant wallets.")
            return True
            
    except Exception as e:
        print(f"❌ Error adding admin funds: {e}")
        import traceback
        traceback.print_exc()
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    import sys
    amount = 100000.00
    if len(sys.argv) > 1:
        amount = float(sys.argv[1])
        
    print(f"Adding {amount} to admin wallet...")
    add_admin_fund_direct(amount)
