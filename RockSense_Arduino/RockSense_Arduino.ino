/*************************************************
 * RockSense Emergency Alarm Controller (Updated)
 * Features:
 * 1. START alarm via Serial command
 * 2. STOP alarm via Serial command
 * 3. Physical STOP button (emergency override)
 * 4. Blinking LED and Buzzer
 *************************************************/

#define BUZZER_PIN 8
#define LED_PIN 9
#define STOP_BUTTON_PIN 7   // Physical STOP button (to GND)

String command = "";
bool alarmActive = false;

// Blinking Variables
unsigned long previousMillis = 0;
const long interval = 1000; // Blink interval in ms
int ledState = LOW;

void setup() {
  Serial.begin(9600);

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(STOP_BUTTON_PIN, INPUT_PULLUP); // Button uses internal pull-up

  // Ensure alarm is OFF at startup
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_PIN, LOW);

  Serial.println("RockSense Alarm System Ready");
}

void loop() {

  /* ================================
     PHYSICAL STOP BUTTON (HIGHEST PRIORITY)
     ================================ */
  /* 
  if (digitalRead(STOP_BUTTON_PIN) == LOW) {
    stopAlarm();
    Serial.println("ALARM_STOPPED_BY_PHYSICAL_BUTTON");
    delay(300); // debounce
  }
  */

  /* ================================
     SERIAL COMMAND CONTROL
     ================================ */
  if (Serial.available()) {
    command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "START") {
      startAlarm();
      Serial.println("ALARM_STARTED");
    }

    else if (command == "STOP") {
      stopAlarm();
      Serial.println("ALARM_STOPPED_BY_DASHBOARD");
    }
  }

  /* ================================
     ALARM BLINKING LOGIC
     ================================ */
  if (alarmActive) {
    unsigned long currentMillis = millis();

    if (currentMillis - previousMillis >= interval) {
      previousMillis = currentMillis;

      // Toggle State
      if (ledState == LOW) {
        ledState = HIGH;
      } else {
        ledState = LOW;
      }

      digitalWrite(LED_PIN, ledState);
      digitalWrite(BUZZER_PIN, ledState);
    }
  } else {
    // Ensure forced off if not active
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    ledState = LOW;
  }
}

/* ================================
   ALARM CONTROL FUNCTIONS
   ================================ */

void startAlarm() {
  alarmActive = true;
}

void stopAlarm() {
  alarmActive = false;
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
}
