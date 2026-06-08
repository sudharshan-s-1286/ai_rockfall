
import asyncio
import httpx
from app.config import get_settings

# Mock data
ADMIN_ID = "ADM-001"
WORKER_ID = "WKR-TEST-001"

async def test_worker_endpoints():
    base_url = "http://localhost:8000"
    
    async with httpx.AsyncClient(base_url=base_url) as client:
        print("1. Creating a new worker...")
        new_worker = {
            "name": "Test Worker",
            "user_id": WORKER_ID,
            "password": "password123",
            "shift": "Morning",
            "assigned_zone": "Sector 4",
            "blood_group": "O+",
            "fitness_status": "Fit"
        }
        try:
            resp = await client.post("/workers/", json=new_worker)
            if resp.status_code == 200:
                print("   Success:", resp.json())
                worker_id = resp.json()['id']
            elif resp.status_code == 400 and "exists" in resp.text:
                 print("   Worker already exists, fetching details...")
                 # Fetch existing to get ID
                 all_workers = await client.get("/workers/")
                 target = next((w for w in all_workers.json() if w['user_id'] == WORKER_ID), None)
                 worker_id = target['id']
                 print("   Found existing ID:", worker_id)
            else:
                print("   Failed:", resp.text)
                return

            print("\n2. Getting Worker Profile (Dashboard)...")
            resp = await client.get(f"/workers/me?user_id={WORKER_ID}")
            if resp.status_code == 200:
                print("   Success:", resp.json()['name'])
            else:
                print("   Failed:", resp.text)

            print("\n3. Updating Worker Health...")
            update_data = {"fitness_status": "Unfit", "medical_condition": "Flu"}
            resp = await client.put(f"/workers/{worker_id}", json=update_data)
            if resp.status_code == 200:
                print("   Success:", resp.json()['fitness_status'])
            else:
                print("   Failed:", resp.text)

            print("\n4. Deleting Worker...")
            resp = await client.delete(f"/workers/{worker_id}")
            if resp.status_code == 200:
                print("   Success: Deleted")
            else:
                print("   Failed:", resp.text)

        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_worker_endpoints())
