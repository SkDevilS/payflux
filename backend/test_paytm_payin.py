"""
Paytm Megacart UPI Intent Payin Complete Test Script
Tests Step 1 (initiateTransaction -> txnToken) and Step 2 (processTransaction -> upi://pay? Deep Link)
specifically for UPI INTENT (paymentMode: 'UPI_INTENT', requestType: 'NATIVE').
Run from project root: python test_paytm_payin.py
"""

import sys
import os
import json
import requests
from datetime import datetime

# Add backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

# Load environment variables from .env file if available
env_path = os.path.join(os.path.dirname(backend_dir), '.env')
if os.path.exists(env_path):
    print(f"Loading environment from: {env_path}")
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ[k.strip()] = v.strip().strip("'").strip('"')

from paytm_megacart_service import paytm_megacart_service

def test_upi_intent_process(base_url, mid, order_id, txn_token):
    """
    Step 2: Call processTransaction with txnToken specifically for UPI INTENT (upi://pay?...)
    """
    print("\n" + "-" * 70)
    print("STEP 2: Calling processTransaction for UPI Intent Deep Link...")
    print("-" * 70)

    process_url = f"{base_url}/theia/api/v1/processTransaction?mid={mid}&orderId={order_id}"
    print(f"[POST] Request URL: {process_url}")

    process_payload = {
        "head": {
            "txnToken": txn_token
        },
        "body": {
            "requestType": "NATIVE",
            "mid": mid,
            "orderId": str(order_id),
            "paymentMode": "UPI_INTENT"
        }
    }

    try:
        res = requests.post(
            process_url,
            headers={'Content-Type': 'application/json'},
            data=json.dumps(process_payload, separators=(',', ':')),
            timeout=20
        )
        print(f"HTTP Status: {res.status_code}")
        res_json = res.json()
        result_info = res_json.get('body', {}).get('resultInfo', {})
        status = result_info.get('resultStatus')
        code = result_info.get('resultCode')
        msg = result_info.get('resultMsg')

        print(f"Result Status : {status}")
        print(f"Result Code   : {code}")
        print(f"Result Msg    : {msg}")

        deep_link_info = res_json.get('body', {}).get('deepLinkInfo', {})
        deep_link = deep_link_info.get('deepLink', '')
        trans_id = deep_link_info.get('transId', '')

        if deep_link or status == 'S':
            print("\n" + "=" * 70)
            print("[SUCCESS] LIVE UPI INTENT DEEP LINK RECEIVED!")
            print("=" * 70)
            if trans_id:
                print(f"Paytm TransId     : {trans_id}")
            print(f"UPI Intent String : {deep_link}")
            print("=" * 70)
            print("You can copy the UPI Intent String above into any UPI app (Google Pay, PhonePe, Paytm) to test payment!")
            return True
        else:
            print("\n[WARNING] UPI Intent call returned an error / inactive status:")
            print(f"Message: {msg} (Code: {code})")
            print("Note: On Paytm production, UPI Intent must be switched from ELIGIBLE to ACTIVE by Paytm Support on your MID.")
            return False

    except Exception as e:
        print(f"Process Transaction Error: {e}")
        return False

def test_payin_initiate():
    print("=" * 70)
    print("PAYTM MEGACART (UPI INTENT) - PAYIN LIVE TEST")
    print("=" * 70)

    # 1. Print Configuration
    base_url = paytm_megacart_service.base_url
    mid = paytm_megacart_service.mid
    key = paytm_megacart_service.merchant_key
    website_name = paytm_megacart_service.website_name

    print(f"Base URL     : {base_url}")
    print(f"MID          : {mid[:4]}***{mid[-4:] if len(mid) >= 8 else mid}")
    print(f"Merchant Key : {'*' * 12}{key[-4:] if len(key) >= 4 else 'NOT SET'}")
    print(f"Website Name : {website_name}")
    print("-" * 70)

    if not mid or not key:
        print("[ERROR] PAYTM_MEGACART_MID or PAYTM_MEGACART_MERCHANT_KEY is missing in .env")
        print("Please set them in your .env file and re-run this script.")
        return

    # 2. Test Step 1: initiateTransaction -> txnToken
    order_id = f"TEST_{int(datetime.now().timestamp())}"
    test_amount = "1.00"

    body = {
        "requestType": "Payment",
        "mid": mid,
        "websiteName": website_name,
        "orderId": order_id,
        "txnAmount": {
            "value": test_amount,
            "currency": "INR"
        },
        "userInfo": {
            "custId": "CUST_TEST_001"
        },
        "callbackUrl": f"https://api.moneyone.co.in/api/callback/paytm_megacart/payin?ref={order_id}"
    }

    print(f"Testing OrderID: {order_id}")
    print("STEP 1: Calling initiateTransaction to get txnToken...")

    # Compact JSON (separators=(',', ':') - NO SPACES)
    body_compact_str = json.dumps(body, separators=(',', ':'))
    sig_compact = paytm_megacart_service.generate_signature(body_compact_str, key)

    payload_compact = {
        "body": body,
        "head": {
            "signature": sig_compact
        }
    }

    init_url = f"{base_url}/theia/api/v1/initiateTransaction?mid={mid}&orderId={order_id}"
    print(f"[POST] Request URL: {init_url}")

    try:
        res = requests.post(
            init_url,
            headers={'Content-Type': 'application/json'},
            data=json.dumps(payload_compact, separators=(',', ':')),
            timeout=15
        )
        print(f"HTTP Status: {res.status_code}")
        res_json = res.json()
        result_info = res_json.get('body', {}).get('resultInfo', {})
        print(f"Result Status : {result_info.get('resultStatus')}")
        print(f"Result Code   : {result_info.get('resultCode')}")
        print(f"Result Msg    : {result_info.get('resultMsg')}")

        txn_token = res_json.get('body', {}).get('txnToken')
        if result_info.get('resultStatus') == 'S' and txn_token:
            print(f"\n[SUCCESS] Received Txn Token: {txn_token[:15]}...")
            # Execute Step 2 specifically for UPI INTENT
            test_upi_intent_process(base_url, mid, order_id, txn_token)
            return
        else:
            print("\n[ERROR] Step 1 failed:")
            print(json.dumps(res_json, indent=2))
            return
    except Exception as e:
        print(f"Request error: {e}")

if __name__ == '__main__':
    test_payin_initiate()
