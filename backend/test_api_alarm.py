import requests
import time

BASE_URL = "http://localhost:8000"

def test_alarm():
    print("1. Triggering Alarm START via API...")
    try:
        res = requests.post(f"{BASE_URL}/alarm/start")
        print(f"   Response: {res.status_code} - {res.json()}")
    except Exception as e:
        print(f"   Failed to connect to API: {e}")
        return

    print("2. Waiting 3 seconds...")
    time.sleep(3)

    print("3. Triggering Alarm STOP via API...")
    try:
        res = requests.post(f"{BASE_URL}/alarm/stop")
        print(f"   Response: {res.status_code} - {res.json()}")
    except Exception as e:
        print(f"   Failed to connect to API: {e}")

if __name__ == "__main__":
    test_alarm()
