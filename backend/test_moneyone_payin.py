"""
Test MoneyOne Payin API
"""
import requests
import json
import base64
from datetime import datetime
import time
import random
from config import Config
from utils import encrypt_aes, decrypt_aes

def test_moneyone_payin():
    """Test MoneyOne payin order creation directly via HTTP"""
    
    print("=" * 60)
    print("Testing MoneyOne Payin API")
    print("=" * 60)
    
    # Configuration
    base_url = Config.MONEYONE_BASE_URL
    merchant_id = Config.MONEYONE_MERCHANT_ID
    password = Config.MONEYONE_PASSWORD
    auth_key = Config.MONEYONE_AUTH_KEY
    module_secret = Config.MONEYONE_MODULE_SECRET
    aes_key = Config.MONEYONE_AES_KEY
    aes_iv = Config.MONEYONE_AES_IV
    
    print(f"\nBase URL: {base_url}")
    print(f"Merchant ID: {merchant_id}")
    print(f"Auth Key: {auth_key[:10]}... (len: {len(auth_key)})")
    print(f"Module Secret: {module_secret[:10]}... (len: {len(module_secret)})")
    print(f"AES Key length: {len(aes_key)}")
    print(f"AES IV length: {len(aes_iv)}")
    
    # Step 1: Generate Token
    print("\n" + "=" * 60)
    print("Step 1: Generating Token")
    print("=" * 60)
    
    token_url = f"{base_url}/api/merchant/login"
    
    token_payload = {
        'merchantId': merchant_id,
        'password': password
    }
    
    try:
        print(f"Token URL: {token_url}")
        print(f"Token Payload: {{'merchantId': '{merchant_id}', 'password': '***'}}")
        
        token_response = requests.post(
            token_url,
            headers={'Content-Type': 'application/json'},
            json=token_payload,
            timeout=30
        )
        
        print(f"\nToken Response Status: {token_response.status_code}")
        
        if token_response.status_code not in [200, 201]:
            print(f"Token Response: {token_response.text}")
            print("\n✗ Token generation failed!")
            return
            
        token_data = token_response.json()
        if not token_data.get('success'):
            print("\n✗ Token generation failed!")
            print(f"Error: {token_data.get('message')}")
            return
        
        token = token_data.get('token')
        print(f"\n✓ Token generated successfully!")
        print(f"Token: {token[:50]}...")
        
    except Exception as e:
        print(f"\n✗ Token generation exception: {e}")
        return

    # Step 2: Create Order
    print("\n" + "=" * 60)
    print("Step 2: Creating Payin Order")
    print("=" * 60)
    
    order_url = f"{base_url}/api/payin/order/create"
    
    # Generate Txn ID
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    random_part = str(random.randint(1000, 9999))
    txn_id = f"MO_TEST_{timestamp}_{random_part}"
    
    order_headers = {
        'Authorization': f'Bearer {token}',
        'X-Authorization-Key': auth_key,
        'X-Module-Secret': module_secret,
        'Content-Type': 'application/json'
    }
    
    callback_url = "https://api.payflux.online/payin/callback/moneyone"
    
    payload_dict = {
        "amount": 100,
        "orderid": txn_id,
        "payee_fname": "Test",
        "payee_lname": "User",
        "payee_mobile": "9876543210",
        "payee_email": "test@example.com",
        "callbackurl": callback_url
    }
    
    print(f"Order URL: {order_url}")
    print(f"Order Payload (Pre-Encryption): {json.dumps(payload_dict, indent=2)}")
    
    try:
        # Encrypt payload
        json_payload = json.dumps(payload_dict)
        encrypted_payload = encrypt_aes(json_payload, aes_key, aes_iv)
        
        print(f"\nEncrypted Payload Length: {len(encrypted_payload)}")
        
        order_response = requests.post(
            order_url,
            headers=order_headers,
            json={'data': encrypted_payload},
            timeout=30
        )
        
        print(f"\nOrder Response Status: {order_response.status_code}")
        
        if order_response.status_code not in [200, 201]:
            print("\n✗ Order creation failed!")
            print(f"Error: {order_response.text}")
            return
            
        print(f"Encrypted Response: {order_response.text[:100]}...")
        
        try:
            response_json = order_response.json()
            encrypted_response_data = response_json.get('data')
            
            if not encrypted_response_data:
                print("\n✗ Failed: Response did not contain 'data' key")
                return
                
            decrypted_response_text = decrypt_aes(encrypted_response_data, aes_key, aes_iv)
            moneyone_response = json.loads(decrypted_response_text)
            
            print(f"\nDecrypted Response: {json.dumps(moneyone_response, indent=2)}")
            
            if moneyone_response.get('success', True) and ('txn_id' in moneyone_response or 'upi_link' in moneyone_response):
                print("\n✓ Order created successfully!")
                print(f"UPI Link: {moneyone_response.get('upi_link', 'N/A')}")
                print(f"QR String: {moneyone_response.get('qr_string', 'N/A')}")
                print(f"Intent URL: {moneyone_response.get('intent_url', 'N/A')}")
                print(f"Payment Link: {moneyone_response.get('payment_link', 'N/A')}")
            else:
                print("\n✗ Order creation failed!")
                print(f"Error: {moneyone_response.get('message')}")
                
        except Exception as e:
            print(f"\n✗ Failed to decrypt response: {e}")
            
    except Exception as e:
        print(f"\n✗ Order creation exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_moneyone_payin()
