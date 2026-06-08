import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
from app.config import get_settings

async def test_mongo():
    settings = get_settings()
    uri = settings.MONGODB_URI
    db_name = settings.MONGODB_DB_NAME
    
    print(f"Testing connection to: {uri.split('@')[-1]}") # Hide credentials
    
    try:
        client = AsyncIOMotorClient(
            uri, 
            tlsCAFile=certifi.where(),
            tlsAllowInvalidCertificates=True,
            serverSelectionTimeoutMS=5000 # 5 second timeout
        )
        
        # Force a connection check
        print("Pinging MongoDB...")
        await client.admin.command('ping')
        print("Successfully pinged MongoDB!")
        
        db = client[db_name]
        print(f"Checking database: {db_name}")
        collections = await db.list_collection_names()
        print(f"Collections found: {collections}")
        
        # Check specific collection 'Worker'
        if 'Worker' in collections:
            count = await db.Worker.count_documents({})
            print(f"Found {count} documents in 'Worker' collection.")
        else:
            print("Warning: 'Worker' collection not found!")
            
    except Exception as e:
        print(f"FAILED to connect to MongoDB: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_mongo())
