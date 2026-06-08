import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings
import sys
import os

# Fix encoding
sys.stdout.reconfigure(encoding='utf-8')

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
    required_fields = ["name", "user_id", "shift", "assigned_zone", "status", "is_onsite", "fitness_status"]
    
    idx = 0
    async for doc in cursor:
        idx += 1
        print(f"\n--- Document {idx} ---")
        missing = [f for f in required_fields if f not in doc]
        if missing:
            print(f"MISSING FIELDS: {missing}")
            print(f"ID: {doc.get('_id')}")
        else:
            print("All required fields present.")
            
        # Check types
        for f in required_fields:
            if f in doc and doc[f] is None:
                 print(f"NULL FIELD: {f}")

if __name__ == "__main__":
    try:
        asyncio.run(inspect_data())
    except Exception as e:
        print(f"Error: {e}")
