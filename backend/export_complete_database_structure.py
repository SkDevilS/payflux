"""
Complete Database Structure Export Script
==========================================
This script exports the complete database structure (schema) from RDS MySQL
without any data. It generates SQL CREATE statements for all tables, indexes,
foreign keys, and constraints.

Usage:
    python export_complete_database_structure.py

Output:
    - database_structure.sql: Complete SQL file with all CREATE TABLE statements
    - database_structure_report.txt: Human-readable report of the structure
"""

import pymysql
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}


def get_database_connection():
    """Create and return a database connection"""
    try:
        connection = pymysql.connect(**DB_CONFIG)
        print(f"✓ Connected to database: {DB_CONFIG['database']}")
        return connection
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        raise


def get_all_tables(cursor):
    """Get list of all tables in the database"""
    cursor.execute("SHOW TABLES")
    tables = [list(row.values())[0] for row in cursor.fetchall()]
    return tables


def get_table_create_statement(cursor, table_name):
    """Get the CREATE TABLE statement for a specific table"""
    cursor.execute(f"SHOW CREATE TABLE `{table_name}`")
    result = cursor.fetchone()
    create_statement = list(result.values())[1]
    return create_statement


def get_table_info(cursor, table_name):
    """Get detailed information about table structure"""
    cursor.execute(f"DESCRIBE `{table_name}`")
    columns = cursor.fetchall()
    
    cursor.execute(f"""
        SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH,
            IS_NULLABLE,
            COLUMN_DEFAULT,
            COLUMN_KEY,
            EXTRA,
            COLUMN_COMMENT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = '{DB_CONFIG['database']}'
        AND TABLE_NAME = '{table_name}'
        ORDER BY ORDINAL_POSITION
    """)
    detailed_columns = cursor.fetchall()
    
    return detailed_columns


def get_table_indexes(cursor, table_name):
    """Get all indexes for a table"""
    cursor.execute(f"SHOW INDEX FROM `{table_name}`")
    indexes = cursor.fetchall()
    return indexes


def get_foreign_keys(cursor, table_name):
    """Get all foreign key constraints for a table"""
    cursor.execute(f"""
        SELECT 
            CONSTRAINT_NAME,
            COLUMN_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = '{DB_CONFIG['database']}'
        AND TABLE_NAME = '{table_name}'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    """)
    foreign_keys = cursor.fetchall()
    return foreign_keys


def get_table_row_count(cursor, table_name):
    """Get approximate row count for a table"""
    try:
        cursor.execute(f"SELECT COUNT(*) as count FROM `{table_name}`")
        result = cursor.fetchone()
        return result['count']
    except:
        return 0


def export_database_structure():
    """Main function to export complete database structure"""
    
    print("\n" + "="*70)
    print("DATABASE STRUCTURE EXPORT TOOL")
    print("="*70)
    print(f"Database: {DB_CONFIG['database']}")
    print(f"Host: {DB_CONFIG['host']}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70 + "\n")
    
    connection = get_database_connection()
    cursor = connection.cursor()
    
    # Get all tables
    tables = get_all_tables(cursor)
    print(f"Found {len(tables)} tables in database\n")
    
    # Prepare output files
    sql_file = "database_structure.sql"
    report_file = "database_structure_report.txt"
    
    with open(sql_file, 'w', encoding='utf-8') as sql_f, \
         open(report_file, 'w', encoding='utf-8') as report_f:
        
        # Write SQL file header
        sql_f.write(f"-- Database Structure Export\n")
        sql_f.write(f"-- Database: {DB_CONFIG['database']}\n")
        sql_f.write(f"-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        sql_f.write(f"-- Total Tables: {len(tables)}\n")
        sql_f.write(f"-- WARNING: This file contains ONLY structure, NO data\n\n")
        sql_f.write(f"-- Disable foreign key checks during import\n")
        sql_f.write(f"SET FOREIGN_KEY_CHECKS = 0;\n\n")
        
        # Write report file header
        report_f.write("="*70 + "\n")
        report_f.write("DATABASE STRUCTURE REPORT\n")
        report_f.write("="*70 + "\n")
        report_f.write(f"Database: {DB_CONFIG['database']}\n")
        report_f.write(f"Host: {DB_CONFIG['host']}\n")
        report_f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        report_f.write(f"Total Tables: {len(tables)}\n")
        report_f.write("="*70 + "\n\n")
        
        # Process each table
        for idx, table_name in enumerate(tables, 1):
            print(f"[{idx}/{len(tables)}] Processing table: {table_name}")
            
            try:
                # Get CREATE TABLE statement
                create_statement = get_table_create_statement(cursor, table_name)
                
                # Write to SQL file
                sql_f.write(f"-- Table: {table_name}\n")
                sql_f.write(f"DROP TABLE IF EXISTS `{table_name}`;\n")
                sql_f.write(create_statement + ";\n\n")
                
                # Get detailed table information
                columns = get_table_info(cursor, table_name)
                indexes = get_table_indexes(cursor, table_name)
                foreign_keys = get_foreign_keys(cursor, table_name)
                row_count = get_table_row_count(cursor, table_name)
                
                # Write to report file
                report_f.write(f"\n{'='*70}\n")
                report_f.write(f"TABLE: {table_name}\n")
                report_f.write(f"{'='*70}\n")
                report_f.write(f"Approximate Rows: {row_count:,}\n")
                report_f.write(f"Total Columns: {len(columns)}\n\n")
                
                # Column details
                report_f.write("COLUMNS:\n")
                report_f.write("-" * 70 + "\n")
                for col in columns:
                    col_name = col['COLUMN_NAME']
                    col_type = col['DATA_TYPE']
                    col_length = col['CHARACTER_MAXIMUM_LENGTH']
                    col_null = col['IS_NULLABLE']
                    col_key = col['COLUMN_KEY']
                    col_extra = col['EXTRA']
                    col_default = col['COLUMN_DEFAULT']
                    
                    type_str = col_type
                    if col_length:
                        type_str += f"({col_length})"
                    
                    key_str = ""
                    if col_key == 'PRI':
                        key_str = " [PRIMARY KEY]"
                    elif col_key == 'UNI':
                        key_str = " [UNIQUE]"
                    elif col_key == 'MUL':
                        key_str = " [INDEX]"
                    
                    extra_str = ""
                    if col_extra:
                        extra_str = f" {col_extra}"
                    
                    null_str = "NULL" if col_null == 'YES' else "NOT NULL"
                    
                    default_str = ""
                    if col_default is not None:
                        default_str = f" DEFAULT '{col_default}'"
                    
                    report_f.write(f"  • {col_name}: {type_str} {null_str}{default_str}{key_str}{extra_str}\n")
                
                # Index details
                if indexes:
                    report_f.write(f"\nINDEXES:\n")
                    report_f.write("-" * 70 + "\n")
                    index_dict = {}
                    for idx_info in indexes:
                        idx_name = idx_info['Key_name']
                        if idx_name not in index_dict:
                            index_dict[idx_name] = {
                                'columns': [],
                                'unique': not idx_info['Non_unique'],
                                'type': idx_info['Index_type']
                            }
                        index_dict[idx_name]['columns'].append(idx_info['Column_name'])
                    
                    for idx_name, idx_data in index_dict.items():
                        unique_str = "UNIQUE " if idx_data['unique'] else ""
                        cols_str = ", ".join(idx_data['columns'])
                        report_f.write(f"  • {unique_str}{idx_name}: ({cols_str}) [{idx_data['type']}]\n")
                
                # Foreign key details
                if foreign_keys:
                    report_f.write(f"\nFOREIGN KEYS:\n")
                    report_f.write("-" * 70 + "\n")
                    for fk in foreign_keys:
                        report_f.write(f"  • {fk['CONSTRAINT_NAME']}: {fk['COLUMN_NAME']} -> ")
                        report_f.write(f"{fk['REFERENCED_TABLE_NAME']}.{fk['REFERENCED_COLUMN_NAME']}\n")
                
                report_f.write("\n")
                
            except Exception as e:
                print(f"  ✗ Error processing table {table_name}: {e}")
                sql_f.write(f"-- ERROR processing table {table_name}: {e}\n\n")
                report_f.write(f"ERROR: {e}\n\n")
        
        # Write SQL file footer
        sql_f.write(f"-- Re-enable foreign key checks\n")
        sql_f.write(f"SET FOREIGN_KEY_CHECKS = 1;\n\n")
        sql_f.write(f"-- End of structure export\n")
        
        # Write report summary
        report_f.write("\n" + "="*70 + "\n")
        report_f.write("EXPORT SUMMARY\n")
        report_f.write("="*70 + "\n")
        report_f.write(f"Total tables exported: {len(tables)}\n")
        report_f.write(f"SQL file: {sql_file}\n")
        report_f.write(f"Report file: {report_file}\n")
        report_f.write("="*70 + "\n")
    
    cursor.close()
    connection.close()
    
    print("\n" + "="*70)
    print("EXPORT COMPLETED SUCCESSFULLY!")
    print("="*70)
    print(f"✓ SQL Structure File: {sql_file}")
    print(f"✓ Detailed Report: {report_file}")
    print(f"✓ Total Tables: {len(tables)}")
    print("\nYou can now use the SQL file to create the same structure")
    print("in another database using:")
    print(f"  mysql -u username -p target_database < {sql_file}")
    print("="*70 + "\n")


if __name__ == "__main__":
    try:
        export_database_structure()
    except Exception as e:
        print(f"\n✗ Export failed: {e}")
        import traceback
        traceback.print_exc()
