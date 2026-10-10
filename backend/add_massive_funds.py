#!/usr/bin/env python3
"""
Add 10,000,000,000,000 to admin wallet main balance
"""
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database_pooled import get_db_connection

def add_massive_funds():
    amount_to_add = 10000000000000.00
    
    try:
        conn = get_db_connection()
        if not conn:
            print("❌ Database connection failed")
            return False
            
        with conn.cursor() as cursor:
            # Check if admin_wallet exists for 'admin'
            cursor.execute("SELECT main_balance FROM admin_wallet WHERE admin_id = 'admin'")
            result = cursor.fetchone()
            
            if result:
                current_balance = float(result['main_balance'])
                new_balance = current_balance + amount_to_add
                cursor.execute("""
                    UPDATE admin_wallet
                    SET main_balance = %s, last_updated = NOW()
                    WHERE admin_id = 'admin'
                """, (new_balance,))
            else:
                current_balance = 0.00
                new_balance = amount_to_add
                cursor.execute("INSERT IGNORE INTO admin_users (admin_id, password_hash, is_active) VALUES ('admin', 'system', 1)")
                cursor.execute("""
                    INSERT INTO admin_wallet (admin_id, main_balance, unsettled_balance)
                    VALUES ('admin', %s, 0)
                """, (new_balance,))
            
            # Record the transaction with the specific description required by wallet_routes.py
            awt_id = f"AWT{datetime.now().strftime('%Y%m%d%H%M%S%f')[:17]}"
            ref_id = f"TOPUP_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # IMPORTANT: The description MUST contain 'Manual balance adjustment' to be calculated in the admin overview API
            cursor.execute("""
                INSERT INTO admin_wallet_transactions 
                (admin_id, txn_id, txn_type, amount, balance_before, balance_after, 
                 description, reference_id, created_at)
                VALUES ('admin', %s, 'CREDIT', %s, %s, %s, %s, %s, NOW())
            """, (awt_id, amount_to_add, current_balance, new_balance, 
                  "Manual balance adjustment - Added Massive Funds", ref_id))
            
            conn.commit()
            print(f"✅ Successfully added ₹{amount_to_add:,.2f} to admin wallet")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_massive_funds()
