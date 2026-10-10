import os
import pymysql
from dotenv import load_dotenv

def export_schema():
    # Load environment variables from .env file
    load_dotenv()

    # Get database credentials from environment variables
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME')
    DB_PORT = int(os.getenv('DB_PORT', 3306))

    if not DB_NAME:
        print("Error: DB_NAME environment variable is missing.")
        return

    output_file = f"{DB_NAME}_schema.sql"

    print(f"Connecting to database '{DB_NAME}' at {DB_HOST}...")

    try:
        # Establish connection to the database
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            port=DB_PORT,
            cursorclass=pymysql.cursors.DictCursor
        )

        with connection.cursor() as cursor:
            # Fetch all table names
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            
            if not tables:
                print("No tables found in the database.")
                return

            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(f"-- Database Schema Export for '{DB_NAME}'\n")
                f.write("-- Generated automatically\n\n")
                f.write("SET FOREIGN_KEY_CHECKS=0;\n\n")

                # Iterate through all tables to get their CREATE statements
                for table_row in tables:
                    table_name = list(table_row.values())[0]
                    print(f"Extracting schema for table: {table_name}")
                    
                    # This will fetch the exact table structure with all keys and indexes
                    cursor.execute(f"SHOW CREATE TABLE `{table_name}`")
                    create_table_data = cursor.fetchone()
                    
                    if "Create Table" in create_table_data:
                        create_statement = create_table_data["Create Table"]
                        f.write(f"-- Table structure for `{table_name}`\n")
                        f.write(f"DROP TABLE IF EXISTS `{table_name}`;\n")
                        f.write(f"{create_statement};\n\n")
                    elif "Create View" in create_table_data:
                        create_statement = create_table_data["Create View"]
                        f.write(f"-- View structure for `{table_name}`\n")
                        f.write(f"DROP VIEW IF EXISTS `{table_name}`;\n")
                        f.write(f"{create_statement};\n\n")

                f.write("SET FOREIGN_KEY_CHECKS=1;\n")
                
        print(f"\nSuccessfully exported schema (with keys/indexes, without data) to {output_file}")
            
    except pymysql.MySQLError as e:
        print(f"Database error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        if 'connection' in locals() and connection.open:
            connection.close()

if __name__ == "__main__":
    export_schema()
