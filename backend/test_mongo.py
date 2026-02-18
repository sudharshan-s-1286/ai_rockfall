import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import certifi

# Use the URI from config
URI = "mongodb+srv://admin:admin@cluster0.45t37tr.mongodb.net/?appName=Cluster0"

async def test_mongo():
    print("Connecting to MongoDB...")
    try:
        client = AsyncIOMotorClient(URI, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=5000)
        # Force a command to verify connection
        print("Pinging...")
        await client.admin.command('ping')
        print("MongoDB Connection Successful!")
    except Exception as e:
        print(f"MongoDB Connection Failed: {repr(e)}")

if __name__ == "__main__":
    asyncio.run(test_mongo())
