import os
import pymysql
from pymysql.constants import CLIENT
from dotenv import load_dotenv

def create_fresh_database():
    # Load environment variables
    load_dotenv()
    
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'pay101_db') # Defaults to pay101_db if not in .env
    DB_PORT = int(os.getenv('DB_PORT', 3306))
    
    sql_file = "pay101_db_schema.sql"
    
    if not os.path.exists(sql_file):
        print(f"Error: {sql_file} not found in the current directory.")
        return
        
    print(f"Reading schema from {sql_file}...")
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_script = f.read()

    print(f"Connecting to MySQL server at {DB_HOST}...")

    try:
        # Connect to MySQL server first (without selecting a database)
        # client_flag=CLIENT.MULTI_STATEMENTS allows multiple queries separated by ';'
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT,
            client_flag=CLIENT.MULTI_STATEMENTS,
            cursorclass=pymysql.cursors.DictCursor
        )

        with connection.cursor() as cursor:
            # Create the database if it doesn't exist
            print(f"Creating database '{DB_NAME}' if it does not exist...")
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci")
            
            # Switch to the database
            print(f"Using database '{DB_NAME}'...")
            cursor.execute(f"USE `{DB_NAME}`")
            
            # Execute the SQL schema script
            print(f"Executing table creation statements...")
            cursor.execute(sql_script)
            
            # Commit the changes
            connection.commit()
            
            print("Successfully created the fresh database and initialized all tables without any data!")
            
    except pymysql.MySQLError as e:
        print(f"Database error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        if 'connection' in locals() and connection.open:
            connection.close()

if __name__ == "__main__":
    create_fresh_database()
