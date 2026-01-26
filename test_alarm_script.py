import asyncio
import sys
import os

# Add backend to path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from app.services.arduino_service import arduino_service

async def test_alarm_workflow():
    print("1. Testing Connection...")
    if not arduino_service.connection:
        print("   Connection is closed. Sending command will trigger connect() (causing reset if DTR not handled).")
    
    print("2. Starting Alarm...")
    result = await arduino_service.start_alarm()
    print(f"   Start Result: {result}")
    
    print("3. Waiting 5 seconds (Alarm should be ON)...")
    await asyncio.sleep(5)
    
    print("4. Stopping Alarm...")
    result = await arduino_service.stop_alarm()
    print(f"   Stop Result: {result}")

    print("5. Closing connection explicitly (cleanup).")
    if arduino_service.connection:
        arduino_service.connection.close()

if __name__ == "__main__":
    asyncio.run(test_alarm_workflow())
