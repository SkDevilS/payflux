#!/usr/bin/env python3
"""
Test Paytm Megacart Callback Simulator
Simulates Paytm sending an NVP/form-encoded webhook callback to /api/callback/paytm_megacart/payin
with an automatically generated valid CHECKSUMHASH.

Usage:
    python3 test_paytm_callback.py <ORDER_ID> [STATUS] [AMOUNT] [BASE_URL]

Examples:
    # Simulate a SUCCESS callback for order ORD4323534554434589
    python3 test_paytm_callback.py ORD4323534554434589 TXN_SUCCESS 5.00

    # Simulate a FAILURE callback
    python3 test_paytm_callback.py ORD4323534554434589 TXN_FAILURE 5.00

    # Simulate against local development server
    python3 test_paytm_callback.py ORD4323534554434589 TXN_SUCCESS 5.00 http://localhost:5000
"""

import sys
import os
import random
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import service to generate valid checksum
from paytm_megacart_service import paytm_megacart_service

def run_test_callback(order_id, status="TXN_SUCCESS", amount="5.00", base_url="https://api.payflux.online"):
    mid = os.getenv("PAYTM_MEGACART_MID", "TEST_MID_12345678")
    key = os.getenv("PAYTM_MEGACART_MERCHANT_KEY", "")

    if not key:
        print("[WARNING] PAYTM_MEGACART_MERCHANT_KEY not found in environment. Using fallback test key.")
        key = "TEST_MERCHANT_KEY_12345678"

    # Build the exact NVP dictionary Paytm sends in callbacks
    callback_data = {
        "ORDERID": str(order_id),
        "MID": mid,
        "TXNID": f"202607311112128{random.randint(10000000, 99999999)}",
        "TXNAMOUNT": f"{float(amount):.2f}",
        "PAYMENTMODE": "UPI",
        "CURRENCY": "INR",
        "TXNDATE": datetime.now().strftime("%Y-%m-%d %H:%M:%S.0"),
        "STATUS": status,
        "RESPCODE": "01" if status == "TXN_SUCCESS" else "810",
        "RESPMSG": "Txn Success" if status == "TXN_SUCCESS" else "Payment failed due to a technical error. Please try after some time.",
        "GATEWAYNAME": "PPBLC",
        "BANKTXNID": str(random.randint(6800000, 6899999))
    }

    print("-" * 70)
    print("PAYTM MEGACART WEBHOOK CALLBACK SIMULATOR")
    print("-" * 70)
    print(f"Target URL : {base_url}/api/callback/paytm_megacart/payin")
    print(f"Order ID   : {order_id}")
    print(f"Status     : {status}")
    print(f"Amount     : INR {callback_data['TXNAMOUNT']}")
    print(f"Bank Ref   : {callback_data['BANKTXNID']}")

    # Step 1: Compute valid CHECKSUMHASH using merchant key
    checksum = paytm_megacart_service.generate_signature(callback_data, key)
    callback_data["CHECKSUMHASH"] = checksum
    print(f"Generated CHECKSUMHASH: {checksum[:30]}...")

    print("-" * 70)
    print("SENDING POST REQUEST...")
    print("-" * 70)

    url = f"{base_url}/api/callback/paytm_megacart/payin"

    try:
        # Paytm sends form-encoded POST requests
        response = requests.post(
            url,
            data=callback_data,
            timeout=15
        )

        print(f"HTTP Status Code : {response.status_code}")
        print(f"Response Body    : {response.text}")

        if response.status_code == 200:
            print("\n[SUCCESS] Webhook callback successfully accepted and processed by server!")
        else:
            print("\n[FAILED] Server rejected or failed to process the webhook.")

    except Exception as e:
        print(f"\n[ERROR] Request failed: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 test_paytm_callback.py <ORDER_ID> [TXN_SUCCESS|TXN_FAILURE] [AMOUNT] [BASE_URL]")
        print("Example: python3 test_paytm_callback.py ORD4323534554434589 TXN_SUCCESS 5.00")
        sys.exit(1)

    order_id = sys.argv[1]
    status = sys.argv[2] if len(sys.argv) > 2 else "TXN_SUCCESS"
    amount = sys.argv[3] if len(sys.argv) > 3 else "5.00"
    base_url = sys.argv[4] if len(sys.argv) > 4 else os.getenv("BACKEND_URL", "https://api.moneyone.co.in")

    run_test_callback(order_id, status, amount, base_url)
