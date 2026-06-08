import serial
import time
import sys

def main():
    port = "COM8"
    baudrate = 9600
    
    print(f"Connecting to Arduino on {port} at {baudrate} baud...")
    try:
        ser = serial.Serial(port, baudrate, timeout=1)
        time.sleep(2) # Wait for Arduino to reset
        print("Connected!\n")
        
        # Read the initial startup message
        while ser.in_waiting > 0:
            print(f"[Arduino Startup]: {ser.readline().decode('utf-8').strip()}")
        
        while True:
            cmd = input("\nEnter command (HIGH_RISK, STOP, STATUS) or 'exit': ")
            if cmd.lower() == 'exit':
                break
            
            if cmd:
                # Send the command
                ser.write((cmd + '\n').encode('utf-8'))
                
                # Wait a split second for Arduino to process and reply
                time.sleep(0.5)
                
                # Read all available response lines
                responses_received = False
                while ser.in_waiting > 0:
                    reading = ser.readline().decode('utf-8').strip()
                    if reading:
                        print(f"[Arduino]: {reading}")
                        responses_received = True

                if not responses_received:
                    print("[Arduino]: (No response received)")
                
    except serial.SerialException as e:
        print(f"Failed to connect: {e}")
    except KeyboardInterrupt:
        print("\nExiting...")
    finally:
        if 'ser' in locals() and ser.is_open:
            ser.close()
            print("Serial port closed.")

if __name__ == '__main__':
    main()
