import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings

# Need to set up path to import app.config
import sys
import os
sys.path.append(os.getcwd())

async def inspect_data():
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    
    print(f"Connected to DB: {settings.MONGODB_DB_NAME}")
    
    collection = db["workers"]
    count = await collection.count_documents({})
    print(f"Found {count} documents in 'workers' collection.")
    
    cursor = collection.find({})
    async for doc in cursor:
        print("\n--- Document ---")
        # Print raw dict
        print(doc)
        
        # Check for missing fields required by Worker model
        required_fields = ["name", "user_id", "shift", "assigned_zone"]
        missing = [f for f in required_fields if f not in doc]
        if missing:
            print(f"❌ CRITICAL: Missing required fields: {missing}")
        else:
            print("✅ Basic required fields present.")

        # Check types
        if "_id" in doc:
            print(f"ID Type: {type(doc['_id'])}")

if __name__ == "__main__":
    try:
        asyncio.run(inspect_data())
    except Exception as e:
        print(f"Error: {e}")
