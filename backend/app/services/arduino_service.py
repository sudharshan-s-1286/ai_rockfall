import serial
import time
import asyncio
from functools import partial
from app.config import get_settings
from app.logging_config import logger

settings = get_settings()

class ArduinoService:
    def __init__(self):
        self.port = settings.ARDUINO_PORT
        self.baud = settings.ARDUINO_BAUDRATE
        self.connection = None
        
    def connect(self):
        try:
            if not self.connection or not self.connection.is_open:
                self.connection = serial.Serial(self.port, self.baud, timeout=1)
                time.sleep(2) # Wait for reboot
                logger.info(f"Connected to Arduino on {self.port}")
        except Exception as e:
            logger.error(f"Failed to connect to Arduino: {e}")
            self.connection = None

    def _send_command(self, cmd: str):
        if not self.connection:
            self.connect()
        
        if self.connection and self.connection.is_open:
            try:
                self.connection.write(f"{cmd}\n".encode())
                logger.info(f"Sent command to Arduino: {cmd}")
                
                arduino_msg = ""
                # Check for immediate response (e.g. debug info from Arduino)
                time.sleep(0.1)
                if self.connection.in_waiting:
                    arduino_msg = self.connection.read(self.connection.in_waiting).decode(errors='ignore').strip()
                    logger.info(f"Arduino Response: {arduino_msg}")

                return True, arduino_msg
            except Exception as e:
                logger.error(f"Error sending command: {e}")
                self.connection = None # Reset
                return False, str(e)
        return False, "No connection"

    async def start_alarm(self):
        try:
            return await asyncio.to_thread(self._send_command, "START")
        except asyncio.CancelledError:
            logger.warning("Arduino alarm task cancelled (likely server shutdown).")
            return False, "Cancelled"

    async def stop_alarm(self):
        try:
            return await asyncio.to_thread(self._send_command, "STOP")
        except asyncio.CancelledError:
            logger.warning("Arduino stop task cancelled.")
            return False, "Cancelled"

    def check_health(self):
        # returns True if serial port is open/accessible
        if self.connection and self.connection.is_open:
            return True
            
        # Passive check: Check if port exists in system without opening (avoids Reset)
        # We need to import list_ports inside or at top. Importing here to avoid verifying imports above.
        from serial.tools import list_ports
        ports = [p.device for p in list_ports.comports()]
        if self.port in ports:
            return True
            
        return False

arduino_service = ArduinoService()
