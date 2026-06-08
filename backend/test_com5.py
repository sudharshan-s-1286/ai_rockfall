
import serial
import time
import sys

def test_com5():
    port = "COM5"
    print(f"--- Testing {port} ---")
    try:
        # Try connecting with short timeout
        s = serial.Serial(port, 9600, timeout=2)
        print(f"Success: Opened {port}")
        
        # Wait for Arduino reset
        time.sleep(2)
        
        # Try writing
        print("Sending 'PING'...")
        s.write(b"PING\n")
        
        # Read response
        response = ""
        # Read with timeout
        start = time.time()
        while time.time() - start < 3:
            if s.in_waiting:
                response += s.read(s.in_waiting).decode('utf-8', errors='ignore')
            time.sleep(0.1)
            
        print(f"Response: '{response.strip()}'")
        
        s.close()
        print(f"Closed {port}")
        return True
        
    except serial.SerialException as e:
        print(f"Failed to open {port}: {e}")
        return False
    except Exception as e:
        print(f"Error on {port}: {e}")
        return False

if __name__ == "__main__":
    if test_com5():
        print("COM5 verified.")
    else:
        print("COM5 failed.")
