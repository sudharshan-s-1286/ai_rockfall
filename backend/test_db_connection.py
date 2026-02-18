
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys

# URI from config.py
URI = "mongodb+srv://admin:admin@cluster0.45t37tr.mongodb.net/?appName=Cluster0"
DB_NAME = "rocksense_db"

async def ping_server():
    client = AsyncIOMotorClient(URI, serverSelectionTimeoutMS=5000)
    try:
        # The ismaster command is cheap and does not require auth.
        await client.admin.command('ismaster')
        print("MongoDB Connection Successful!")
    except Exception as e:
        print(f"MongoDB Connection Failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(ping_server())
