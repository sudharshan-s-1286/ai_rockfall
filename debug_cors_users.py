import requests
import sys

BASE_URL = "http://localhost:8000/admin/users"

def test_cors_and_fetch():
    print(f"Testing Endpoint: {BASE_URL}")
    
    # 1. Test OPTIONS (Preflight)
    try:
        print("\n--- Sending OPTIONS Request (CORS Preflight) ---")
        resp_opt = requests.options(BASE_URL, headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET"
        })
        print(f"Status: {resp_opt.status_code}")
        print("Headers:", resp_opt.headers)
        
        if "Access-Control-Allow-Origin" in resp_opt.headers:
            print("✅ CORS Headers Present in Preflight")
        else:
            print("❌ CORS Headers MISSING in Preflight")
            
    except Exception as e:
        print(f"❌ OPTIONS Request Failed: {e}")

    # 2. Test GET (Actual Request)
    try:
        print("\n--- Sending GET Request ---")
        resp_get = requests.get(BASE_URL, headers={
            "Origin": "http://localhost:5173"
        })
        print(f"Status: {resp_get.status_code}")
        print(f"Content-Type: {resp_get.headers.get('Content-Type')}")
        print("Response Body Snippet:", resp_get.text[:500])
        
        if resp_get.status_code == 200:
            print("✅ GET Request Successful")
        elif resp_get.status_code == 500:
            print("❌ Server Error (500). Check backend logs for traceback.")
        else:
            print(f"❌ Unexpected Status: {resp_get.status_code}")

    except Exception as e:
        print(f"❌ GET Request Failed: {e}")

if __name__ == "__main__":
    test_cors_and_fetch()
