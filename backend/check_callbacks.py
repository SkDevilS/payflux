import sys
import os
import json
from datetime import datetime

# Add the current directory to path so we can import database
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import get_db_connection

def check_callbacks():
    print("=== Checking MoneyOne Payout Status ===")
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database.")
        return
        
    try:
        with conn.cursor() as cursor:
            # Check the last 5 MoneyOne payout transactions
            cursor.execute("""
                SELECT txn_id, order_id, reference_id, amount, status, pg_txn_id, created_at, updated_at
                FROM payout_transactions
                WHERE pg_partner = 'MONEYONE'
                ORDER BY created_at DESC
                LIMIT 5
            """)
            
            transactions = cursor.fetchall()
            
            if not transactions:
                print("No MoneyOne payout transactions found.")
            else:
                for txn in transactions:
                    print("-" * 50)
                    print(f"Internal Txn ID: {txn['txn_id']}")
                    print(f"Sent as Order ID: {txn['order_id']}")
                    print(f"Reference ID: {txn['reference_id']}")
                    print(f"Amount: {txn['amount']}")
                    print(f"Status: {txn['status']}")
                    print(f"PG Txn ID (MoneyOne's ID): {txn['pg_txn_id']}")
                    print(f"Created At: {txn['created_at']}")
                    print(f"Last Updated: {txn['updated_at']}")
                    
                    # If updated_at > created_at by a few seconds, it means a callback likely updated it
                    if txn['updated_at'] and txn['created_at']:
                        time_diff = (txn['updated_at'] - txn['created_at']).total_seconds()
                        if time_diff > 2 and txn['status'] not in ['INITIATED', 'QUEUED']:
                            print(">>> CALLBACK RECEIVED AND PROCESSED! <<<")
                        elif txn['status'] in ['INITIATED', 'QUEUED']:
                            print(">>> WAITING FOR CALLBACK... <<<")
            
            print("\n=== Checking Callback Logs ===")
            # Assuming you have a general callback_logs table where errors might be logged
            cursor.execute("""
                SELECT * FROM callback_logs 
                WHERE request_data LIKE '%moneyone%' OR callback_url LIKE '%moneyone%'
                ORDER BY created_at DESC
                LIMIT 5
            """)
            
            logs = cursor.fetchall()
            if logs:
                for log in logs:
                    print("-" * 50)
                    print(f"Date: {log['created_at']}")
                    print(f"Txn ID: {log.get('txn_id', 'N/A')}")
                    print(f"Response: {log.get('response_data', '')[:100]}...")
            else:
                print("No error logs found in callback_logs for MoneyOne.")
                
    except Exception as e:
        print(f"Error checking callbacks: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_callbacks()
