import asyncio
import httpx
import websockets
import json

BASE_URL = "http://localhost:8001/api/hardware"
WS_URL = "ws://localhost:8001/ws"

async def listen_ws(channel, duration=3):
    print(f"Listening to {channel} for {duration} seconds...")
    try:
        async with websockets.connect(f"{WS_URL}/{channel}") as websocket:
            try:
                msg = await asyncio.wait_for(websocket.recv(), timeout=duration)
                print(f"[WS {channel}] Received: {msg}")
            except asyncio.TimeoutError:
                print(f"[WS {channel}] No message received in time.")
    except Exception as e:
         print(f"[WS {channel}] Failed to connect: {e}")

async def test_endpoints():
    async with httpx.AsyncClient() as client:
        # 1. Monitoring Data (Unstable -> Stable after 15s)
        print("Testing POST /monitoring-data")
        payload1 = {
            "device_id": "CAM_TEST_01",
            "risk_level": "HIGH",
            "confidence": 0.88,
            "crack_coordinates": [1.5, 2.5]
        }
        res = await client.post(f"{BASE_URL}/monitoring-data", json=payload1)
        print("Monitoring Data Response:", res.text)

        # Send a few more to trigger stable detection
        print("Sending 3 more high-risk detections to trigger stability confirmation...")
        for _ in range(3):
            await client.post(f"{BASE_URL}/monitoring-data", json=payload1)
            await asyncio.sleep(0.5)

        # 2. Worker Telemetry
        print("Testing POST /worker-telemetry")
        payload2 = {
            "worker_id": "01", # Assume it exists
            "latitude": 12.9822,
            "longitude": 80.2213,
            "battery": 85,
            "status": "Transmitting"
        }
        res = await client.post(f"{BASE_URL}/worker-telemetry", json=payload2)
        print("Worker Telemetry Response:", res.text)

        # 3. Mine Alert
        print("Testing POST /mine-alert")
        payload3 = {
            "command": "ALERT",
            "zone": "Sector 4",
            "risk_level": "HIGH"
        }
        res = await client.post(f"{BASE_URL}/mine-alert", json=payload3)
        print("Mine Alert Response:", res.text)

async def main():
    print("Testing API endpoints...")
    # Fire requests
    test_task = asyncio.create_task(test_endpoints())
    
    # Listen to WS in parallel
    await asyncio.gather(
        test_task,
        listen_ws("ai-detections", 5),
        listen_ws("worker-location", 5),
        listen_ws("alerts", 5)
    )

if __name__ == "__main__":
    asyncio.run(main())
