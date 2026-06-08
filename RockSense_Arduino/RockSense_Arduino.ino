/*
 * RockSense Mine Alert System - Arduino Firmware
 * 
 * This code monitors Serial commands from the Raspberry Pi (automatic)
 * and the Backend (manual UI button). It also supports a physical
 * emergency button on Pin 2.
 */

const int LED_PIN = 9;      // LED connected to pin 9
const int BUZZER_PIN = 8;   // Buzzer connected to pin 8
const int BUTTON_PIN = 2;   // Physical button on pin 2

String input = "";
bool alertActive = false;
int lastButtonState = HIGH;

void setup() {
  Serial.begin(9600);
  
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP); // Use internal pull-up resistor

  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  
  Serial.println("RockSense Arduino Ready");
}

void loop() {
  // 1. Handle Serial Commands
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      input.trim();
      processCommand(input);
      input = "";  // clear buffer
    } else {
      input += c;
    }
  }

  // 2. Handle Physical Button (Toggle State)
  int currentButtonState = digitalRead(BUTTON_PIN);
  if (currentButtonState == LOW && lastButtonState == HIGH) {
    // Button pressed (transition from HIGH to LOW due to PULLUP)
    alertActive = !alertActive;
    updateAlertState();
    delay(200); // Debounce
  }
  lastButtonState = currentButtonState;
}

void processCommand(String cmd) {
  // Support both "ALERT" (user request) and "HIGH_RISK" (backend default)
  if (cmd == "ALERT" || cmd == "HIGH_RISK") {
    alertActive = true;
    updateAlertState();
    Serial.println("ALARM_STARTED");
  } 
  else if (cmd == "STOP") {
    alertActive = false;
    updateAlertState();
    Serial.println("ALARM_STOPPED");
  }
}

void updateAlertState() {
  if (alertActive) {
    digitalWrite(LED_PIN, HIGH);
    digitalWrite(BUZZER_PIN, HIGH);
  } else {
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
  }
}
