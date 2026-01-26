int ledPin = 8;     // External LED
int buzzerPin = 9; // Buzzer

void setup() {
  pinMode(LED_BUILTIN, OUTPUT); // Built-in LED (Pin 13)
  pinMode(ledPin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);
}

void loop() {
  // Turn ON LED and buzzer
  digitalWrite(LED_BUILTIN, HIGH);
  digitalWrite(ledPin, HIGH);
  digitalWrite(buzzerPin, HIGH);

  delay(1000); // 1 second

  // Turn OFF LED and buzzer
  digitalWrite(LED_BUILTIN, LOW);
  digitalWrite(ledPin, LOW);
  digitalWrite(buzzerPin, LOW);

  delay(1000); // 1 second
}
