/*
  RockSense Smart Alarm
  Listens for Serial commands:
  - "START": Turns ON Alarm (LED + Buzzer)
  - "STOP": Turns OFF Alarm
*/

int ledPin = 8;
int buzzerPin = 9;
bool alarmActive = false;
String inputString = "";
bool stringComplete = false;

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(ledPin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);
  
  // Initialize Serial
  Serial.begin(9600);
  inputString.reserve(200);
}

void loop() {
  if (stringComplete) {
    inputString.trim(); // Remove whitespace/newlines
    
    if (inputString == "START") {
      alarmActive = true;
      Serial.println("ACK: START");
    } 
    else if (inputString == "STOP") {
      alarmActive = false;
      Serial.println("ACK: STOP");
    }
    
    // clear the string:
    inputString = "";
    stringComplete = false;
  }

  if (alarmActive) {
    digitalWrite(LED_BUILTIN, HIGH);
    digitalWrite(ledPin, HIGH);
    digitalWrite(buzzerPin, HIGH);
    delay(100);
    digitalWrite(ledPin, LOW); // Blink effect
    delay(100);
  } else {
    digitalWrite(LED_BUILTIN, LOW);
    digitalWrite(ledPin, LOW);
    digitalWrite(buzzerPin, LOW);
  }
}

/*
  SerialEvent occurs whenever a new data comes in the hardware serial RX. This
  routine is run between each time loop() runs, so using delay inside loop can
  delay response. Multi-threading is not supported.
*/
void serialEvent() {
  while (Serial.available()) {
    char inChar = (char)Serial.read();
    inputString += inChar;
    if (inChar == '\n') {
      stringComplete = true;
    }
  }
}
