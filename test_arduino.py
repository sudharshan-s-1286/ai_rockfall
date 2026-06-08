import serial
import time

def test_arduino(ports=["COM8", "COM5", "COM6", "COM4", "COM7"], baudrate=9600):
    for port in ports:
        print(f"Attempting connection to Arduino on {port}...")
        try:
            ser = serial.Serial(port, baudrate, timeout=2)
            time.sleep(2) # Wait for Arduino to reset
            print(f"SUCCESS: Connected to {port}")
            
            # Read the initial ready message
            if ser.in_waiting > 0:
                msg = ser.readline().decode(errors='ignore').strip()
                print(f"Arduino says: {msg}")
                
            print("\nSending 'HIGH_RISK' command...")
            ser.write(b"HIGH_RISK\n")
            time.sleep(1)
            
            print("\nSending 'STOP' command...")
            ser.write(b"STOP\n")
            time.sleep(1)
            
            ser.close()
            print(f"\nTest on {port} completed successfully.")
            return # Exit after first success
            
        except serial.SerialException:
            print(f"Failed to connect to {port}. Trying next...")
            continue
        except Exception as e:
            print(f"Error on {port}: {e}")
            continue

    print("\nERROR: Could not connect to any of the specified Arduino ports.")

if __name__ == '__main__':
    test_arduino()
