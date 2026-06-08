import serial
import time
import asyncio
from serial.tools import list_ports
from app.config import get_settings
from app.logging_config import logger

settings = get_settings()

# Known USB vendor/device IDs for Arduino-compatible boards (UNO, SMD, Nano, etc.)
ARDUINO_USB_IDS = [
    (0x2341, None),   # Official Arduino
    (0x1A86, None),   # CH340/CH341 (common on SMD clones)
    (0x0403, 0x6001), # FTDI FT232
    (0x0403, 0x6010), # FTDI FT2232
    (0x0403, 0x6014), # FTDI FT232H
    (0x0403, 0x6015), # FTDI FT X series
    (0x10C4, 0xEA60), # CP2102/CP210x (Silicon Labs)
]

def _find_arduino_ports():
    """
    Returns a list of COM port names that are likely Arduino boards
    by matching USB VID (vendor) and optionally PID (product) IDs.
    Falls back to all ports if none match.
    """
    candidates = []
    all_ports = list_ports.comports()
    
    for port in all_ports:
        vid = port.vid
        pid = port.pid
        matched = False
        for (v, p) in ARDUINO_USB_IDS:
            if vid == v and (p is None or pid == p):
                matched = True
                break
        if matched:
            candidates.append(port.device)
            logger.info(f"Found likely Arduino on {port.device} — {port.description} (VID:{vid:04X} PID:{pid:04X})")

    if not candidates:
        # Fallback: try all available ports
        candidates = [p.device for p in all_ports]
        logger.warning(f"No Arduino fingerprint matched. Falling back to all ports: {candidates}")

    return candidates


class ArduinoService:
    def __init__(self):
        self.port = settings.ARDUINO_PORT
        self.baud = settings.ARDUINO_BAUDRATE
        self.connection = None
        self.active_port = None  # Tracks the actual connected COM port
        
    def connect(self):
        try:
            if self.connection and self.connection.is_open:
                return

            # Prioritize the specific ports requested by the user
            fallback_ports = _find_arduino_ports()
            # Combine priority ports with discovered ports, removing duplicates
            target_ports = settings.ARDUINO_PORTS + [p for p in fallback_ports if p not in settings.ARDUINO_PORTS]
            
            logger.info(f"Targeting Arduino ports in order: {target_ports}")

            for port in target_ports:
                try:
                    logger.info(f"Attempting connection to {port}...")
                    # Standard Arduino handshake
                    conn = serial.Serial(port, self.baud, timeout=1)
                    time.sleep(1.5)  # Wait for board reset
                    
                    self.connection = conn
                    self.active_port = port
                    logger.info(f"Connected to Arduino on {port}")
                    return
                except Exception as e:
                    # Silently try next port
                    continue
            
            logger.error("Could not connect to any Arduino port.")
            self.connection = None
            self.active_port = None

        except Exception as e:
            logger.error(f"Error in Arduino connection: {e}")
            self.connection = None
            self.active_port = None

    def _send_command(self, cmd: str):
        if not self.connection or not self.connection.is_open:
            self.connect()
        
        if self.connection and self.connection.is_open:
            try:
                # Clear input/output buffers to remove stale serial data
                self.connection.reset_input_buffer()
                self.connection.reset_output_buffer()
                
                # Prepend \n to force Arduino to process any garbage left in its string buffer, then send the actual command
                self.connection.write(f"\n{cmd}\n".encode())
                logger.info(f"Sent command to Arduino [{self.active_port}]: {cmd}")
                
                arduino_msg = ""
                time.sleep(0.15)
                if self.connection.in_waiting:
                    arduino_msg = self.connection.read(self.connection.in_waiting).decode(errors='ignore').strip()
                    logger.info(f"Arduino Response: {arduino_msg}")

                return True, arduino_msg
            except Exception as e:
                logger.error(f"Error sending command: {e}")
                self.connection = None
                self.active_port = None
                return False, str(e)
        return False, "No connection"

    async def start_alarm(self):
        try:
            return await asyncio.to_thread(self._send_command, "HIGH_RISK")
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
        # Active connection check (most reliable)
        if self.connection and self.connection.is_open:
            return True

        # Passive: check if any Arduino-fingerprinted port is available
        candidates = _find_arduino_ports()
        if self.port != "AUTO":
            return self.port in candidates
        return len(candidates) > 0

arduino_service = ArduinoService()
