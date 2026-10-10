#!/usr/bin/env python3
"""
Create Admin User Script for Pay101
Creates an admin user with email: admin@pay101.uk and password: Admin@123
"""

import sys
import os
from datetime import datetime
import hashlib

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from database import get_db_connection
    print("✓ Database module imported successfully")
except ImportError as e:
    print(f"✗ Error importing database module: {e}")
    print("Make sure you're running this from the backend directory")
    sys.exit(1)


def hash_password(password):
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()


def create_admin_user():
    """Create admin user in the database"""
    
    # Admin details
    admin_email = "admin@pay101.uk"
    admin_password = "Admin@123"
    admin_name = "System Administrator"
    
    print("\n" + "="*60)
    print("Pay101 - Create Admin User")
    print("="*60)
    print(f"\nCreating admin user:")
    print(f"  Email: {admin_email}")
    print(f"  Password: {admin_password}")
    print(f"  Name: {admin_name}")
    print("\n" + "-"*60)
    
    try:
        # Connect to database
        print("\n[1/5] Connecting to database...")
        conn = get_db_connection()
        
        # Check which MySQL library is being used and create cursor accordingly
        try:
            cursor = conn.cursor(dictionary=True)
            print("✓ Database connection established (mysql-connector)")
        except TypeError:
            # PyMySQL doesn't support dictionary parameter in cursor()
            import pymysql.cursors
            cursor = conn.cursor(pymysql.cursors.DictCursor)
            print("✓ Database connection established (PyMySQL)")
        
        # Check if admin_users table exists
        print("\n[2/5] Checking admin_users table...")
        cursor.execute("SHOW TABLES LIKE 'admin_users'")
        if not cursor.fetchone():
            print("✗ admin_users table does not exist!")
            print("\nCreating admin_users table...")
            
            create_table_query = """
            CREATE TABLE IF NOT EXISTS admin_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admin_id VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(100) NOT NULL,
                role VARCHAR(50) DEFAULT 'admin',
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                last_login TIMESTAMP NULL,
                INDEX idx_admin_id (admin_id),
                INDEX idx_email (email),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
            cursor.execute(create_table_query)
            conn.commit()
            print("✓ admin_users table created successfully")
        else:
            print("✓ admin_users table exists")
        
        # Check if admin already exists
        print("\n[3/5] Checking if admin user already exists...")
        cursor.execute(
            "SELECT * FROM admin_users WHERE email = %s OR admin_id = %s",
            (admin_email, admin_email)
        )
        existing_admin = cursor.fetchone()
        
        if existing_admin:
            print(f"⚠ Admin user already exists!")
            print(f"  Admin ID: {existing_admin['admin_id']}")
            print(f"  Email: {existing_admin['email']}")
            print(f"  Name: {existing_admin['name']}")
            print(f"  Status: {existing_admin['status']}")
            print(f"  Created: {existing_admin['created_at']}")
            
            response = input("\nDo you want to update the password? (yes/no): ").strip().lower()
            if response == 'yes':
                print("\n[4/5] Updating admin password...")
                hashed_password = hash_password(admin_password)
                cursor.execute(
                    """
                    UPDATE admin_users 
                    SET password = %s, updated_at = %s 
                    WHERE email = %s
                    """,
                    (hashed_password, datetime.now(), admin_email)
                )
                conn.commit()
                print("✓ Admin password updated successfully")
            else:
                print("\n✓ No changes made")
                cursor.close()
                conn.close()
                return
        else:
            # Create new admin user
            print("✓ Admin user does not exist, creating new user...")
            
            print("\n[4/5] Creating admin user...")
            hashed_password = hash_password(admin_password)
            
            insert_query = """
            INSERT INTO admin_users (admin_id, email, password, name, role, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            
            cursor.execute(insert_query, (
                admin_email,  # admin_id
                admin_email,  # email
                hashed_password,  # password
                admin_name,  # name
                'super_admin',  # role
                'active',  # status
                datetime.now()  # created_at
            ))
            conn.commit()
            print("✓ Admin user created successfully")
        
        # Verify creation
        print("\n[5/5] Verifying admin user...")
        cursor.execute("SELECT * FROM admin_users WHERE email = %s", (admin_email,))
        admin = cursor.fetchone()
        
        if admin:
            print("✓ Admin user verified in database")
            print("\n" + "="*60)
            print("ADMIN USER DETAILS")
            print("="*60)
            print(f"  Admin ID: {admin['admin_id']}")
            print(f"  Email: {admin['email']}")
            print(f"  Name: {admin['name']}")
            print(f"  Role: {admin['role']}")
            print(f"  Status: {admin['status']}")
            print(f"  Created: {admin['created_at']}")
            print("="*60)
            print("\n✓ SUCCESS! Admin user is ready to use.")
            print("\nLogin Credentials:")
            print(f"  Admin ID: {admin_email}")
            print(f"  Password: {admin_password}")
            print("\nYou can now login at: https://admin.pay101.uk")
        else:
            print("✗ Failed to verify admin user")
        
        # Close connection
        cursor.close()
        conn.close()
        print("\n✓ Database connection closed")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    try:
        create_admin_user()
        print("\n" + "="*60)
        print("Script completed successfully!")
        print("="*60 + "\n")
    except KeyboardInterrupt:
        print("\n\n✗ Script cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        sys.exit(1)
