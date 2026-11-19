/*
  LANDSLIDE MONITOR
  Arduino Uno
  Soil Moisture: A0
  SW-420: D2
*/

const int MOISTURE_PIN = A0;
const int VIBRATION_PIN = 2;

const int DRY_VALUE = 850;
const int WET_VALUE = 350;

void setup() {
    Serial.begin(9600);

    pinMode(VIBRATION_PIN, INPUT);

    Serial.println("LANDSLIDE SYSTEM READY");
}

void loop() {
    int moistureRaw = analogRead(MOISTURE_PIN);

    int vibrationRaw = digitalRead(VIBRATION_PIN);

    // Quy đổi độ ẩm tương đối theo giá trị
    // hiệu chỉnh của cảm biến
    int moisturePercent = map(
        moistureRaw,
        DRY_VALUE,
        WET_VALUE,
        0,
        100
    );

    moisturePercent = constrain(
        moisturePercent,
        0,
        100
    );

    // SW-420 chỉ cung cấp tín hiệu số
    // nên đây không phải cường độ rung chính xác
    int vibrationValue = vibrationRaw == HIGH ? 100 : 0;

    // Gửi dữ liệu theo định dạng JSON
    Serial.print("{");
    Serial.print("\"moisture\":");
    Serial.print(moisturePercent);

    Serial.print(",\"vibration\":");
    Serial.print(vibrationValue);

    Serial.print(",\"temperature\":24");

    Serial.println("}");

    delay(2000);
}