import requests
import json
import os
import uuid
import sys

BASE_URL = "https://api.payflux.online/api"

# Pass merchant credentials as command line args or set them here
merchant_email = sys.argv[1] if len(sys.argv) > 1 else "7679022140"
merchant_password = sys.argv[2] if len(sys.argv) > 2 else "So@080903"
merchant_tpin = sys.argv[3] if len(sys.argv) > 3 else "742102"

def run_test():
    print(f"Testing payout with {merchant_email}...")
    
    # 1. Login to get token
    login_payload = {
        "merchantId": merchant_email,
        "password": merchant_password
    }
    
    print("\n--- 1. Logging in ---")
    response = requests.post(f"{BASE_URL}/merchant/login", json=login_payload)
    
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        print("Please provide valid credentials: python test_thefoxes_payout.py <email> <password> <tpin>")
        return
        
    token = response.json().get("token")
    merchant_id = response.json().get("merchantId")
    print(f"Login successful! Merchant ID: {merchant_id}")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 2. Hit Payout Endpoint
    # We pass pg_partner explicitly in the payload to force it to route to THEFOXES
    order_id = f"TEST_FOX_{uuid.uuid4().hex[:8].upper()}"
    payout_payload = {
        "amount": 200.0,
        "account_holder_name": "Soham Karmakar",
        "account_number": "033325221677550",
        "ifsc_code": "NESF0000333",
        "bank_name": "Slice Bank",
        "payment_type": "IMPS",
        "purpose": "Test",
        "bene_email": "john@example.com",
        "bene_mobile": "9876543210",
        "tpin": merchant_tpin,
        "order_id": order_id,
        "callback_url": "https://webhook.site/2031b904-9fb0-421d-ab9d-dca67f731d8a",
        "pg_partner": "THEFOXES"
    }
    
    print("\n--- 2. Initiating Payout ---")
    print(f"Payload: {json.dumps(payout_payload, indent=2)}")
    
    payout_response = requests.post(f"{BASE_URL}/payout/client/direct-payout", json=payout_payload, headers=headers)
    
    print(f"\nStatus Code: {payout_response.status_code}")
    print(f"Response: {json.dumps(payout_response.json(), indent=2)}")

if __name__ == "__main__":
    run_test()
