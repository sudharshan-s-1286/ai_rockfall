import requests
import random

BASE_URL = "http://localhost:8000"

def debug_create_user():
    print("\n--- Debugging POST /admin/users/create (422 Error) ---")
    
    # Generate unique ID
    rand_id = random.randint(10000, 99999)
    user_id = f"DEBUG-{rand_id}"
    
    # Data exactly as frontend sends it (Multipart Form Data)
    payload = {
        "name": "Debug User",
        "user_id": user_id,
        "password": "debugpassword",
        "shift": "Morning",
        "assigned_zone": "Sector 4"
    }
    
    # We are NOT sending a photo to start with, matching the 'if (photo)' logic
    
    try:
        response = requests.post(f"{BASE_URL}/admin/users/create", data=payload)
        
        print(f"Status Code: {response.status_code}")
        print("Response Body:")
        print(response.text)
        
        if response.status_code == 422:
            print("\nAnalysis: 422 means Validation Error. Check 'loc' in the response above to see which field is missing or invalid.")
            
    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    debug_create_user()
