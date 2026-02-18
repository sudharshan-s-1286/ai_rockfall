import requests
import random
import sys

BASE_URL = "http://localhost:8000"

def test_get_users():
    print("\n--- Testing GET /admin/users ---")
    try:
        response = requests.get(f"{BASE_URL}/admin/users")
        if response.status_code == 200:
            users = response.json()
            print(f"✅ Success! Retrieved {len(users)} users.")
        else:
            print(f"❌ Failed with Status Code: {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"❌ Connection Error: {e}")

def test_create_user():
    print("\n--- Testing POST /admin/users/create ---")
    
    # Generate unique ID
    rand_id = random.randint(1000, 9999)
    user_id = f"WKR-{rand_id}"
    
    payload = {
        "name": "Test User",
        "user_id": user_id,
        "password": "password123",
        "shift": "Morning",
        "assigned_zone": "Sector 4"
    }
    
    try:
        # requests automatically handles multipart/form-data when 'files' is passed, 
        # or we can pass data for Form fields.
        response = requests.post(f"{BASE_URL}/admin/users/create", data=payload)
        
        if response.status_code == 200:
            print(f"✅ Success! Created user {user_id}")
            print(f"Response: {response.json()}")
        else:
            print(f"❌ Failed with Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    test_get_users()
    test_create_user()
