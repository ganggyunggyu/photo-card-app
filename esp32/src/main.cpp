/*
 * ESP32 BLE - Photo Card Trigger
 *
 * BLE로 "DISPENSE" 명령을 받으면 릴레이를 트리거합니다.
 */

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

const int LED_PIN = 2;
const int RELAY_PIN = 4;
const unsigned long TRIGGER_DURATION_MS = 300;
const unsigned long COOLDOWN_MS = 2000;

unsigned long lastTriggerTime = 0;
BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;

void triggerOutput() {
  Serial.println("Triggering output...");
  digitalWrite(LED_PIN, HIGH);
  digitalWrite(RELAY_PIN, HIGH);
  delay(TRIGGER_DURATION_MS);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(RELAY_PIN, LOW);
  Serial.println("Trigger complete");
}

class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("Client connected!");
    for (int i = 0; i < 2; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      delay(100);
    }
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("Client disconnected");
    pServer->startAdvertising();
  }
};

class MyCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();

    if (value.length() > 0) {
      Serial.print("Received: ");
      Serial.println(value.c_str());

      if (value == "DISPENSE") {
        unsigned long now = millis();

        if (now - lastTriggerTime < COOLDOWN_MS) {
          Serial.println("Cooldown active");
          pCharacteristic->setValue("COOLDOWN");
          pCharacteristic->notify();
          return;
        }

        lastTriggerTime = now;
        triggerOutput();

        pCharacteristic->setValue("OK");
        pCharacteristic->notify();
      }
    }
  }
};

void setup() {
  Serial.begin(115200);
  Serial.println("\n\nStarting BLE Server...");

  pinMode(LED_PIN, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(RELAY_PIN, LOW);

  BLEDevice::init("PhotoCard");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_NOTIFY
  );

  pCharacteristic->addDescriptor(new BLE2902());
  pCharacteristic->setCallbacks(new MyCallbacks());
  pCharacteristic->setValue("READY");

  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("\n=== BLE Server Ready ===");
  Serial.println("Device name: PhotoCard");
  Serial.println("Send 'DISPENSE' to trigger");
  Serial.println("========================\n");

  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }
}

void loop() {
  // 연결 유지를 위한 keepalive (30초마다)
  static unsigned long lastKeepAlive = 0;
  if (deviceConnected && millis() - lastKeepAlive > 30000) {
    lastKeepAlive = millis();
    if (pCharacteristic) {
      pCharacteristic->notify();
    }
  }
  delay(10);
}
