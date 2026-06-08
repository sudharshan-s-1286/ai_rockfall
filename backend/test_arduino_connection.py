
import serial
import time
import serial.tools.list_ports
import sys

def test_ports():
    with open("arduino_test_result.txt", "w") as f:
        sys.stdout = f
        sys.stderr = f
        
        ports = [p.device for p in serial.tools.list_ports.comports()]
        print(f"Available ports: {ports}")
        
        for port in ports:
            print(f"\n--- Testing {port} ---")
            try:
                # Try connecting (DTR=True resets Arduino usually)
                s = serial.Serial(port, 9600, timeout=2)
                print(f"Success: Opened {port}")
                
                # Wait for Arduino reset
                time.sleep(2)
                
                # Try writing
                print("Sending 'PING'...")
                s.write(b"PING\n")
                
                # Read response
                if s.in_waiting:
                    response = s.read(s.in_waiting).decode('utf-8', errors='ignore').strip()
                    print(f"Response: '{response}'")
                else:
                    print("No data received immediately.")
                    
                s.close()
                print(f"Closed {port}")
                
            except serial.SerialException as e:
                print(f"Failed to open {port}: {e}")
            except Exception as e:
                print(f"Error on {port}: {e}")

if __name__ == "__main__":
    test_ports()
