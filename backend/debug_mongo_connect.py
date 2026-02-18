import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
import sys

# URI from config.py
MONGODB_URI = "mongodb+srv://admin:admin@cluster0.45t37tr.mongodb.net/?appName=Cluster0"

async def test_connection():
    print(f"Testing connection to: {MONGODB_URI}")
    print(f"Python version: {sys.version}")
    
    # Attempt 1: Standard with certifi
    print("\n--- Attempt 1: With certifi ---")
    try:
        client = AsyncIOMotorClient(MONGODB_URI, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=5000)
        info = await client.server_info()
        print("SUCCESS! Connected.")
        print(info)
        return
    except Exception as e:
        print(f"FAILED: {e}")

    # Attempt 2: No certifi
    print("\n--- Attempt 2: No specific tlsCAFile (system default) ---")
    try:
        client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        info = await client.server_info()
        print("SUCCESS! Connected.")
        print(info)
        return
    except Exception as e:
        print(f"FAILED: {e}")

    # Attempt 3: Insecure skip verify
    print("\n--- Attempt 3: tlsAllowInvalidCertificates=True ---")
    try:
        client = AsyncIOMotorClient(MONGODB_URI, tlsAllowInvalidCertificates=True, serverSelectionTimeoutMS=5000)
        info = await client.server_info()
        print("SUCCESS! Connected (INSECURE).")
        print(info)
        return
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
