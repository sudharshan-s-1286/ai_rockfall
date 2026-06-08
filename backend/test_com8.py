"""
RockSense — Arduino COM8 Diagnostic
Checks if the Arduino responds to START / STOP commands on COM8 at 9600 baud.
Run this BEFORE starting the backend server (closes the port after testing).
"""

import serial
import time

PORT = "COM8"
BAUD = 9600
TIMEOUT = 3

def test_arduino():
    print(f"\n{'='*50}")
    print(f"  RockSense Arduino COM8 Diagnostic")
    print(f"{'='*50}\n")

    # ── 1. Open the port ────────────────────────────────
    try:
        ser = serial.Serial(PORT, BAUD, timeout=TIMEOUT)
        print(f"[OK]  Port {PORT} opened successfully at {BAUD} baud.")
    except serial.SerialException as e:
        print(f"[FAIL] Cannot open {PORT}: {e}")
        print("\nPossible fixes:")
        print("  • Make sure no other program (Arduino IDE Serial Monitor) is using COM8")
        print("  • Unplug and re-plug the USB cable")
        print("  • Check Device Manager → Ports for the correct COM number")
        return

    # ── 2. Wait for board reset + greeting ──────────────
    print("\n[...] Waiting 2 seconds for board to reset...")
    time.sleep(2)

    greeting = ""
    if ser.in_waiting:
        greeting = ser.read(ser.in_waiting).decode(errors='ignore').strip()
        print(f"[OK]  Board greeting received: \"{greeting}\"")
    else:
        print("[WARN] No greeting received (board may already be running, or reset not triggered).")

    # ── 3. Send START command ────────────────────────────
    print("\n[...] Sending 'START' command...")
    ser.write(b"START\n")
    time.sleep(0.5)

    response = ""
    if ser.in_waiting:
        response = ser.read(ser.in_waiting).decode(errors='ignore').strip()
        if "ALARM_STARTED" in response:
            print(f"[OK]  Arduino responded correctly: \"{response}\"")
            print("      => Buzzer + LED should be ON now")
        else:
            print(f"[WARN] Unexpected response to START: \"{response}\"")
    else:
        print("[FAIL] No response to 'START' command.")
        print("       => Arduino may not be reading serial correctly, or wrong sketch uploaded.")

    # ── 4. Send STOP command ─────────────────────────────
    time.sleep(1)
    print("\n[...] Sending 'STOP' command...")
    ser.write(b"STOP\n")
    time.sleep(0.5)

    response = ""
    if ser.in_waiting:
        response = ser.read(ser.in_waiting).decode(errors='ignore').strip()
        if "ALARM_STOPPED" in response:
            print(f"[OK]  Arduino responded correctly: \"{response}\"")
            print("      => Buzzer + LED should be OFF now")
        else:
            print(f"[WARN] Unexpected response to STOP: \"{response}\"")
    else:
        print("[FAIL] No response to 'STOP' command.")

    # ── 5. Summary ───────────────────────────────────────
    ser.close()
    print(f"\n{'='*50}")
    if "ALARM_STARTED" in response or "ALARM_STOPPED" in response:
        print("  RESULT: Arduino is CONNECTED and RESPONDING correctly!")
        print("  You can now start the backend server.")
    elif greeting:
        print("  RESULT: Arduino is CONNECTED (greeting received) but NOT responding to commands.")
        print("  => Make sure the correct sketch (RockSense_Arduino.ino) is uploaded.")
    else:
        print("  RESULT: Arduino connected on COM8 but NOT sending any data.")
        print("  => Try re-uploading the sketch via Arduino IDE.")
    print(f"{'='*50}\n")

if __name__ == "__main__":
    test_arduino()
