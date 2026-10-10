import pymysql
from config import db_config

def test():
    try:
        conn = pymysql.connect(**db_config)
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            print("Testing active routes query...")
            cursor.execute("""
                SELECT 
                    pg_partner as route_name,
                    COALESCE(SUM(amount), 0) as today_payin
                FROM payin_transactions
                WHERE DATE(created_at) = CURDATE() AND status = 'SUCCESS'
                AND pg_partner IN (
                    SELECT DISTINCT pg_partner 
                    FROM service_routing 
                    WHERE service_type = 'PAYIN' AND is_active = 1
                )
                GROUP BY pg_partner
                HAVING today_payin > 0
                ORDER BY today_payin DESC
            """)
            print(cursor.fetchall())
            
            print("Testing top merchants query...")
            cursor.execute("""
                SELECT 
                    m.merchant_name,
                    COALESCE(SUM(p.amount), 0) as today_volume
                FROM payin_transactions p
                JOIN merchants m ON p.merchant_id = m.merchant_id
                WHERE DATE(p.created_at) = CURDATE() AND p.status = 'SUCCESS'
                GROUP BY m.merchant_id, m.merchant_name
                HAVING today_volume > 0
                ORDER BY today_volume DESC
            """)
            print(cursor.fetchall())
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    test()
