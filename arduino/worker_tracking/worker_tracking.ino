/*
 * ============================================================================
 *  RockSense — Arduino Nano + GSM Module (Worker Tracking Device)
 * ============================================================================
 *  Receives serial commands from Raspberry Pi:
 *    "WORKER_ALERT\n" → Vibration ON, Buzzer ON, LED ON + GSM SMS
 *    "WORKER_CLEAR\n" → All OFF
 *
 *  Wiring:
 *    Pin 6  → Vibration motor via NPN transistor (BC547 / 2N2222)
 *    Pin 7  → LED (+ 220Ω resistor → GND)
 *    Pin 8  → Buzzer (+) → GND
 *    Pin 10 → GSM TX (SIM800L / SIM900 RX)
 *    Pin 11 → GSM RX (SIM800L / SIM900 TX)
 *
 *  Baud rate: 9600
 *  Emergency SMS target: Change ALERT_NUMBER below.
 * ============================================================================
 */

#include <SoftwareSerial.h>

// ── Pins ─────────────────────────────────────────────────────────────────────
const int VIBRATION_PIN = 6;
const int LED_PIN       = 7;
const int BUZZER_PIN    = 8;
const int GSM_TX        = 10;   // Nano TX → GSM RX
const int GSM_RX        = 11;   // Nano RX → GSM TX

// ── Config ────────────────────────────────────────────────────────────────────
const char ALERT_NUMBER[] = "+91XXXXXXXXXX";   // ← Change to mine safety officer number
const char ALERT_MSG[]    = "ROCKSENSE ALERT: Crack detected in mine. Evacuate Zone immediately!";

SoftwareSerial gsmSerial(GSM_RX, GSM_TX);

// ── State ─────────────────────────────────────────────────────────────────────
String   inputBuffer  = "";
bool     alertActive  = false;
bool     smsSent      = false;

unsigned long lastToggle  = 0;
bool          toggleState = false;
const int     BLINK_MS    = 350;

// ── Setup ──────────────────────────────────────────────────────────────────────
void setup() {
  pinMode(VIBRATION_PIN, OUTPUT);
  pinMode(LED_PIN,        OUTPUT);
  pinMode(BUZZER_PIN,     OUTPUT);
  digitalWrite(VIBRATION_PIN, LOW);
  digitalWrite(LED_PIN,        LOW);
  digitalWrite(BUZZER_PIN,     LOW);

  Serial.begin(9600);
  gsmSerial.begin(9600);

  // GSM init
  delay(1000);
  gsmSerial.println("AT");
  delay(500);
  gsmSerial.println("AT+CMGF=1");   // SMS text mode
  delay(500);

  Serial.println("RockSense Worker Tracking Device — READY");
}

// ── Main Loop ──────────────────────────────────────────────────────────────────
void loop() {
  // Read Pi serial commands
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n') {
      handleCommand(inputBuffer);
      inputBuffer = "";
    } else {
      inputBuffer += c;
    }
  }

  // Pass GSM responses back for debugging
  while (gsmSerial.available() > 0) {
    Serial.write(gsmSerial.read());
  }

  // Non-blocking alert pattern
  if (alertActive) {
    unsigned long now = millis();
    if (now - lastToggle >= BLINK_MS) {
      toggleState = !toggleState;
      digitalWrite(VIBRATION_PIN, toggleState ? HIGH : LOW);
      digitalWrite(LED_PIN,        toggleState ? HIGH : LOW);
      if (toggleState) {
        tone(BUZZER_PIN, 800);
      } else {
        noTone(BUZZER_PIN);
      }
      lastToggle = now;
    }
  }
}

// ── Command Handler ────────────────────────────────────────────────────────────
void handleCommand(String cmd) {
  cmd.trim();

  if (cmd == "WORKER_ALERT") {
    alertActive  = true;
    toggleState  = true;
    lastToggle   = millis();
    digitalWrite(VIBRATION_PIN, HIGH);
    digitalWrite(LED_PIN,        HIGH);
    tone(BUZZER_PIN, 800);
    Serial.println("WORKER_ALERT_ACTIVE");

    // Send SMS once per alert event
    if (!smsSent) {
      sendSMS(ALERT_NUMBER, ALERT_MSG);
      smsSent = true;
    }

  } else if (cmd == "WORKER_CLEAR") {
    alertActive = false;
    smsSent     = false;
    noTone(BUZZER_PIN);
    digitalWrite(VIBRATION_PIN, LOW);
    digitalWrite(LED_PIN,        LOW);
    Serial.println("WORKER_ALERT_CLEARED");

  } else if (cmd == "STATUS") {
    Serial.print("STATUS: ");
    Serial.println(alertActive ? "ALERT_ACTIVE" : "CLEAR");
  }
}

// ── GSM SMS Sender ─────────────────────────────────────────────────────────────
void sendSMS(const char* number, const char* message) {
  Serial.println("Sending SMS alert…");
  gsmSerial.print("AT+CMGS=\"");
  gsmSerial.print(number);
  gsmSerial.println("\"");
  delay(1000);
  gsmSerial.print(message);
  delay(100);
  gsmSerial.write(26);   // Ctrl+Z to send
  delay(3000);
  Serial.println("SMS sent.");
}
