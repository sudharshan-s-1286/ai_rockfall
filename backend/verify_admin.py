import requests
import uuid

BASE_URL = "http://localhost:8000"

def test_create_user():
    print("\n--- Testing Create User ---")
    user_id = f"TEST-{uuid.uuid4().hex[:4]}"
    data = {
        "name": "Test Worker",
        "user_id": user_id,
        "shift": "Morning",
        "assigned_zone": "Sector 4"
    }
    # Mock file upload
    files = {'photo': ('test.jpg', b'fake_image_content', 'image/jpeg')}
    
    try:
        res = requests.post(f"{BASE_URL}/admin/users/create", data=data, files=files)
        if res.status_code == 200:
            print(f"✅ User created: {res.json()['name']} (ID: {res.json()['id']})")
            return res.json()['id'], user_id
        else:
            print(f"❌ Failed to create user: {res.text}")
            return None, None
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return None, None

def test_get_users(created_id):
    print("\n--- Testing Get Users ---")
    try:
        res = requests.get(f"{BASE_URL}/admin/users")
        if res.status_code == 200:
            users = res.json()
            found = any(u['id'] == created_id for u in users)
            if found:
                print(f"✅ Created user found in list. Total users: {len(users)}")
            else:
                print(f"❌ Created user NOT found in list.")
        else:
            print(f"❌ Failed to get users: {res.text}")
    except Exception as e:
        print(f"❌ Connection error: {e}")

def test_update_shift(worker_id):
    print("\n--- Testing Bulk Shift Update ---")
    try:
        payload = {
            "worker_ids": [worker_id],
            "new_shift": "Night"
        }
        res = requests.put(f"{BASE_URL}/admin/users/update-shift", json=payload)
        if res.status_code == 200:
            print("✅ Shift update successful.")
            # Verify update
            res2 = requests.get(f"{BASE_URL}/admin/users")
            users = res2.json()
            user = next((u for u in users if u['id'] == worker_id), None)
            if user and user['shift'] == "Night":
                print("✅ Verified: User shift is now 'Night' and 'Active/On-site'.")
            else:
                print(f"❌ Verification failed. User shift: {user['shift'] if user else 'Not Found'}")
        else:
            print(f"❌ Failed to update shift: {res.text}")
    except Exception as e:
        print(f"❌ Connection error: {e}")

def test_map_data():
    print("\n--- Testing Map Data ---")
    try:
        res = requests.get(f"{BASE_URL}/admin/users/3d-map-data")
        if res.status_code == 200:
            data = res.json()
            print(f"✅ Retrieved map data for {len(data)} workers.")
            if len(data) > 0:
                print(f"Sample: {data[0]}")
        else:
            print(f"❌ Failed to get map data: {res.text}")
    except Exception as e:
        print(f"❌ Connection error: {e}")

if __name__ == "__main__":
    print("Starting verification... Ensure backend is running.")
    wid, userid = test_create_user()
    if wid:
        test_get_users(wid)
        test_update_shift(wid)
        test_map_data()
