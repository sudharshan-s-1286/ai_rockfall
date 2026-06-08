# RockSense Hardware Setup Guide for Cirkit AI

This document provides the exact pinout connections and component list based on the project's source code. You can use this to recreate the system wiring in Cirkit AI or any other circuit simulator.

---

## UNIT 1: Monitoring Unit (Raspberry Pi)

**Core Components:**
- 1x Raspberry Pi 4
- 1x Pi Camera Module (CSI interface) OR USB Camera (V4L2)
- 2x USB Cables (to connect to the Arduinos)

**Connections:**
- **Camera:** Connect to the Raspberry Pi's designated CSI camera port (if using Pi Camera) or USB port (if using a standard webcam).
- **Serial Connection to Unit 3 (Mine Alert System):** Connect the Arduino UNO to the Raspberry Pi via USB (typically maps to `/dev/ttyUSB0` or `/dev/ttyACM0`).
- **Serial Connection to Unit 2 (Worker Tracking):** Connect the Arduino Nano to the Raspberry Pi via USB (typically maps to `/dev/ttyUSB1` or `/dev/ttyACM1`).

---

## UNIT 2: Worker Tracking Device (Arduino Nano)

This unit is a wearable device for miners that receives serial alerts from the Pi and triggers a local alarm and an SMS via GSM.

**Core Components:**
- 1x Arduino Nano
- 1x SIM800L / SIM900 GSM Module
- 1x Vibration Motor
- 1x NPN Transistor (e.g., BC547 or 2N2222)
- 1x Buzzer
- 1x Red LED
- 1x 220Ω Resistor
- Power supply (e.g., 2x 18650 Li-Ion batteries with step-up/down module to provide 5V to Nano and 4V to SIM800L)

**Pin Connections (from `worker_tracking.ino`):**
| Component | Arduino Nano Pin | Notes |
| :--- | :--- | :--- |
| **Vibration Motor** | **Pin 6** | Connect via NPN Transistor (Base to Pin 6, Emitter to GND, Motor between Collector and 5V). |
| **Red LED** | **Pin 7** | Connect in series with a 220Ω resistor to GND. |
| **Buzzer** | **Pin 8** | Connect positive pin to Pin 8, negative to common GND. |
| **GSM Module RX** | **Pin 10** | Arduino TX (Pin 10 in SoftwareSerial) goes to GSM RX. |
| **GSM Module TX** | **Pin 11** | Arduino RX (Pin 11 in SoftwareSerial) goes to GSM TX. |
| **GSM Power** | **External 4V** | SIM800L needs a dedicated ~4V power supply (e.g., LM2596 buck converter). Do not power directly from Nano 5V. |
| **Grounds** | **GND** | Connect all GNDs together. |

---

## UNIT 3: Mine Alert System (Arduino UNO)

This unit acts as the main siren/alert station in the mine. It triggers when a high-risk crack is detected.

**Core Components:**
- 1x Arduino UNO
- 1x Piezo Buzzer / Alarm
- 1x Red LED
- 1x 220Ω Resistor
- 1x Push Button (Optional - for physical emergency stop override)

**Pin Connections (from `RockSense_Arduino.ino` and `mine_alert.ino`):**

*Note: The codebase has two slightly different variations. The recommended one with the physical stop button is below:*

| Component | Arduino UNO Pin | Notes |
| :--- | :--- | :--- |
| **Buzzer** | **Pin 8** | Connect positive to Pin 8, negative to GND. |
| **Red LED** | **Pin 9** | Connect in series with a 220Ω resistor to GND. |
| **Physical STOP Button** | **Pin 7** | Connect one side to Pin 7, the other to GND. (Uses internal pull-up). |
| **Grounds** | **GND** | Connect all GNDs together. |

*(If using the simpler `mine_alert.ino` variant, LED is on Pin 8 and Buzzer is on Pin 9 without a stop button).*

---

## System Workflow for Simulation

1. **Detection (Pi):** The Raspberry Pi reads frames, runs YOLOv11 + Random Forest.
2. **Alert Trigger:** If risk is `HIGH`, Pi sends `"HIGH_RISK\n"` to Unit 3 (UNO) and `"WORKER_ALERT\n"` to Unit 2 (Nano).
3. **Response (UNO - Unit 3):** UNO turns on the LED and Buzzer continuously.
4. **Response (Nano - Unit 2):** Nano turns on LED, Buzzer, activates vibration motor, and sends AT commands to the GSM module to trigger an SMS.
5. **Clearance:** When risk lowers or physical stop is pressed, `"STOP\n"` and `"WORKER_CLEAR\n"` are issued to disable actuators.
