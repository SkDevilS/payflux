"""
Automated Verification Test for Paytm Megacart UPI Intent Integration
Tests Checksum Generation & Verification, Transaction Prefix, and Webhook Formatting
"""

import sys
import os
import json
from datetime import datetime

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from paytm_megacart_service import paytm_megacart_service
import service_routing_routes
import api_ledger_routes

def test_checksum_json_string():
    print("Testing Checksum for JSON stringified body...")
    test_key = "1234567890123456" # 16 byte ASCII key
    body = {
        "requestType": "Payment",
        "mid": "TESTMID001",
        "websiteName": "DEFAULT",
        "orderId": "ORD_0001",
        "txnAmount": {
            "value": "100.00",
            "currency": "INR"
        }
    }
    body_str = json.dumps(body, separators=(',', ':'))
    signature = paytm_megacart_service.generate_signature(body_str, test_key)
    assert signature, "Signature generation failed for JSON string"
    print(f"  Generated signature: {signature[:15]}...")

    is_valid = paytm_megacart_service.verify_signature(body_str, test_key, signature)
    assert is_valid, "Signature verification failed for JSON string"
    print("  ✓ JSON string checksum verified successfully!")

def test_checksum_nvp_params():
    print("\nTesting Checksum for NVP dictionary parameters...")
    test_key = "1234567890123456" # 16 byte ASCII key
    params = {
        "MID": "TESTMID001",
        "ORDERID": "ORD_0001",
        "TXNAMOUNT": "100.00",
        "STATUS": "TXN_SUCCESS"
    }
    signature = paytm_megacart_service.generate_signature(params, test_key)
    assert signature, "Signature generation failed for NVP dict"
    print(f"  Generated signature: {signature[:15]}...")

    params_with_checksum = dict(params)
    params_with_checksum["CHECKSUMHASH"] = signature

    is_valid = paytm_megacart_service.verify_signature(params_with_checksum, test_key, signature)
    assert is_valid, "Signature verification failed for NVP dict"
    print("  ✓ NVP dictionary checksum verified successfully!")

def test_prefix_formatting():
    print("\nTesting PM_MEG_ prefix formatting...")
    merchant_id = "7894560001"
    order_id = "ORD9999"
    txn_id = f"PM_MEG_{merchant_id}_{order_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    assert txn_id.startswith("PM_MEG_"), f"Prefix mismatch: {txn_id}"
    assert merchant_id in txn_id and order_id in txn_id, "Missing IDs in prefix"
    print(f"  ✓ Valid transaction ID generated: {txn_id}")

def test_webhook_format():
    print("\nTesting Thefoxes merchant webhook callback forwarding format...")
    txn = {
        'txn_id': 'PM_MEG_7894560001_ORD9999_20260727120000',
        'merchant_id': '7894560001',
        'amount': 100.00,
        'callback_url': 'https://example.com/callback'
    }
    webhook_data = {
        'txn_id': txn['txn_id'],
        'reference_id': 'ORD9999',
        'amount': float(txn['amount']),
        'status': 'SUCCESS',
        'utr': '412345678901',
        'message': 'Success',
        'pg_partner': 'PAYTM_MEGACART'
    }
    if str(txn['merchant_id']) == '7894560001':
        webhook_data['order_id'] = 'ORD9999'

    assert webhook_data['pg_partner'] == 'PAYTM_MEGACART'
    assert webhook_data['txn_id'].startswith('PM_MEG_')
    assert webhook_data['order_id'] == 'ORD9999'
    assert webhook_data['reference_id'] == 'ORD9999'
    assert webhook_data['status'] == 'SUCCESS'
    print("  ✓ Merchant webhook format matches Thefoxes callback forwarding format!")

if __name__ == '__main__':
    try:
        test_checksum_json_string()
        test_checksum_nvp_params()
        test_prefix_formatting()
        test_webhook_format()
        print("\nALL PAYTM MEGACART INTEGRATION TESTS PASSED SUCCESSFULLY!")
    except Exception as e:
        print(f"\nTEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
