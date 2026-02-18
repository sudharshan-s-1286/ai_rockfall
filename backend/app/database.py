from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings

import certifi

settings = get_settings()

# WARNING: Insecure for production, but needed for local Windows dev in some envs
client = AsyncIOMotorClient(
    settings.MONGODB_URI, 
    tlsCAFile=certifi.where(),
    tlsAllowInvalidCertificates=True
)
db = client[settings.MONGODB_DB_NAME]

async def get_db():
    return db
