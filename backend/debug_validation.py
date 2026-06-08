import asyncio
from app.database import db
from beanie import init_beanie
from app.models import Worker
from app.schemas import WorkerResponse
import sys
import os

# Fix encoding
sys.stdout.reconfigure(encoding='utf-8')

async def debug_validation():
    print("Initializing Beanie...")
    await init_beanie(database=db, document_models=[Worker])
    
    print("Fetching workers...")
    workers = await Worker.find_all().to_list()
    print(f"Found {len(workers)} workers.")
    
    for i, w in enumerate(workers):
        print(f"\n--- Validating Worker {i+1}: {w.name} ({w.id}) ---")
        try:
            # Pydantic v2 use model_validate
            # w is a Worker (Beanie Document), which is a Pydantic model itself
            resp = WorkerResponse.model_validate(w)
            print("✅ Valid")
        except Exception as e:
            print(f"❌ INVALID: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(debug_validation())
    except Exception as e:
        print(f"Fatal Error: {e}")
