import serial.tools.list_ports
import serial
import time
import sys

def list_ports():
    print("Scanning for COM ports...")
    ports = serial.tools.list_ports.comports()
    result = []
    for port in ports:
        print(f"Found: {port.device} - {port.description} [{port.hwid}]")
        result.append(port.device)
    if not result:
        print("No COM ports found!")
    return result

def test_connection(port):
    print(f"\nTesting connection to {port}...")
    try:
        ser = serial.Serial(port, 9600, timeout=1)
        print(f"Successfully opened {port}.")
        print("Waiting 2 seconds for Arduino reset...")
        time.sleep(2)
        
        print("Sending 'START' command...")
        ser.write(b"START\n")
        print("Command sent.")
        
        print("Listening for response (5 seconds)...")
        start_time = time.time()
        while time.time() - start_time < 5:
            if ser.in_waiting:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                print(f"Received from Arduino: {line}")
                if "ALARM_STARTED" in line:
                    print("SUCCESS! Arduino confirmed alarm start.")
                    ser.write(b"STOP\n")
                    ser.close()
                    return True
            time.sleep(0.1)
            
        print("No response received from Arduino.")
        ser.close()
        return False
    except SerialException as e:
        print(f"Failed to connect to {port}: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    ports = list_ports()
    if not ports:
        sys.exit(1)
    
    print("\nWhich port do you want to test? (e.g., COM3)")
    target = input("Enter port name (or press Enter to test all): ").strip().upper()
    
    if target:
        test_connection(target)
    else:
        for p in ports:
            test_connection(p)
