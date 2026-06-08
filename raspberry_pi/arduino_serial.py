# arduino_serial.py
import serial
import time

class ArduinoSerial:
    def __init__(self, port='/dev/ttyUSB0', baudrate=9600):
        try:
            self.ser = serial.Serial(port, baudrate, timeout=1)
            # Give Arduino time to reset
            time.sleep(2)
            print(f"Serial connection established on {port}")
        except Exception as e:
            print(f"Error opening serial port {port}: {e}")
            self.ser = None

    def send_high(self):
        if self.ser:
            self.ser.write(b'HIGH_RISK\n')
            print("Sent 'HIGH_RISK' to Arduino")

    def send_stop(self):
        if self.ser:
            self.ser.write(b'STOP\n')
            print("Sent 'STOP' to Arduino")
            
    def close(self):
        if self.ser:
            self.ser.close()
