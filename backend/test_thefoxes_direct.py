import uuid
import json
import os
import sys

# Add the current directory to sys.path so we can import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from thefoxes_service import ThefoxesService

def test_direct():
    print("Initializing ThefoxesService...")
    
    # We will instantiate the service directly
    foxes = ThefoxesService()
    
    order_id = f"TEST_DIRECT_{uuid.uuid4().hex[:8].upper()}"
    
    # We map the fields how thefoxes_service expects them
    payout_data = {
        'amount': 200.0,
        'reference_id': order_id,
        'bank_name': 'Slice Bank',
        'bene_account': '033325221677550',
        'bene_ifsc': 'NESF0000333',
        'bene_name': 'Soham Karmakar',
        'payment_type': 'IMPS'
    }
    
    print("\n--- Sending request directly to Thefoxes via Service Class ---")
    print(f"Payload to service: {json.dumps(payout_data, indent=2)}")
    
    try:
        # Pass a dummy merchant_id (e.g. 1)
        response = foxes.initiate_payout(1, payout_data)
        
        print(f"\nResponse from thefoxes_service.initiate_payout():")
        print(json.dumps(response, indent=2))
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    test_direct()
