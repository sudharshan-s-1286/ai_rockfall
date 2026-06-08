/*
 * ============================================================================
 *  RockSense — Arduino UNO  (Mine Alert System)
 * ============================================================================
 *  Receives serial commands from Raspberry Pi:
 *    "HIGH_RISK\n"  → LED ON, Buzzer ON  (mine evacuation alert)
 *    "STOP\n"       → LED OFF, Buzzer OFF (all-clear)
 *
 *  Wiring:
 *    Pin 8  → LED (+ 220Ω resistor → GND)
 *    Pin 9  → Buzzer (+) → GND
 *    GND    → common ground
 *
 *  Baud rate: 9600
 * ============================================================================
 */

// ── Pin Definitions ─────────────────────────────────────────────────────────
const int LED_PIN    = 8;
const int BUZZER_PIN = 9;
const int POWER_PIN  = 10;
const int TEST_PIN   = 6;

// ── State ────────────────────────────────────────────────────────────────────
String  inputBuffer  = "";
bool    alertActive  = false;

// ── Buzzer tone (non-blocking) ───────────────────────────────────────────────
unsigned long lastToneToggle = 0;
bool          toneOn         = false;
const int     TONE_FREQ      = 1000;   // Hz
const int     TONE_INTERVAL  = 400;    // ms between on/off

// ── Test Component state ─────────────────────────────────────────────────────
unsigned long lastTestToggle = 0;
bool          testPinOn      = false;

// ── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  pinMode(LED_PIN,    OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(POWER_PIN,  OUTPUT);
  pinMode(TEST_PIN,   OUTPUT); // For component testing

  digitalWrite(LED_PIN,    LOW);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(POWER_PIN,  HIGH); // Default on as power supply
  digitalWrite(TEST_PIN,   LOW);

  Serial.begin(9600);
  Serial.println("RockSense Mine Alert System — READY");
}

// ── Main Loop ────────────────────────────────────────────────────────────────
void loop() {
  // ── Read serial commands ──────────────────────────────────────────────────
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n') {
      handleCommand(inputBuffer);
      inputBuffer = "";
    } else {
      inputBuffer += c;
    }
  }

  // ── Testing Code for Component (Pin 6) ────────────────────────────────────
  unsigned long now = millis();
  if (now - lastTestToggle >= 1000) {  // Wait 1 second
    testPinOn = !testPinOn;            // Toggle state
    digitalWrite(TEST_PIN, testPinOn ? HIGH : LOW);
    lastTestToggle = now;
  }

  // ── Non-blocking buzzer pattern (alternating beep) ────────────────────────
  if (alertActive) {
    unsigned long now = millis();
    if (now - lastToneToggle >= TONE_INTERVAL) {
      toneOn = !toneOn;
      if (toneOn) {
        tone(BUZZER_PIN, TONE_FREQ);
      } else {
        noTone(BUZZER_PIN);
      }
      lastToneToggle = now;
    }
    // Rapid LED flash in sync with buzzer
    digitalWrite(LED_PIN, toneOn ? HIGH : LOW);
  }
}

// ── Command Handler ───────────────────────────────────────────────────────────
void handleCommand(String cmd) {
  cmd.trim();

  if (cmd == "HIGH_RISK") {
    alertActive = true;
    tone(BUZZER_PIN, TONE_FREQ);
    digitalWrite(LED_PIN, HIGH);
    lastToneToggle = millis();
    toneOn = true;
    Serial.println("ALERT_ACTIVATED — LED ON, Buzzer ON");

  } else if (cmd == "STOP") {
    alertActive = false;
    noTone(BUZZER_PIN);
    digitalWrite(LED_PIN, LOW);
    toneOn = false;
    Serial.println("ALERT_CLEARED — LED OFF, Buzzer OFF");

  } else if (cmd == "POWER_ON") {
    digitalWrite(POWER_PIN, HIGH);
    Serial.println("POWER_SUPPLY — Pin 10 ON");

  } else if (cmd == "POWER_OFF") {
    digitalWrite(POWER_PIN, LOW);
    Serial.println("POWER_SUPPLY — Pin 10 OFF");

  } else if (cmd == "STATUS") {
    Serial.print("STATUS: ");
    Serial.println(alertActive ? "ALERT_ACTIVE" : "CLEAR");

  } else if (cmd.length() > 0) {
    Serial.print("UNKNOWN_CMD: ");
    Serial.println(cmd);
  }
}
