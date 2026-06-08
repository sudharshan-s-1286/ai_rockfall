void setup() {
  pinMode(6, OUTPUT);   // Set pin 6 as output
}

void loop() {
  digitalWrite(6, HIGH); // Turn LED ON
  delay(1000);           // Wait 1 second

  digitalWrite(6, LOW);  // Turn LED OFF
  delay(1000);           // Wait 1 second
}
