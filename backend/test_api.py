import httpx
import asyncio

async def main():
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post('http://localhost:8001/api/hardware/monitoring-data', json={
                'device_id': 'TEST', 
                'risk_level': 'HIGH', 
                'confidence': 0.9, 
                'crack_coordinates': [0.0, 0.0]
            })
            print(f"Status: {res.status_code}")
            print(f"Body: {res.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    asyncio.run(main())
