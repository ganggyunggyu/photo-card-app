/*
 * ESP32 BLE GATT Server - Photo Card Trigger
 *
 * Web Bluetooth에서 "PRINT" 명령을 받으면 릴레이/LED를 트리거합니다.
 *
 * 핀 연결:
 * - GPIO 2: 내장 LED (테스트용)
 * - GPIO 4: 릴레이 모듈 (실제 운영용)
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// BLE UUIDs - 웹과 동일하게 맞춰야 함
#define SERVICE_UUID        "12345678-1234-1234-1234-1234567890a1"
#define WRITE_CHAR_UUID     "12345678-1234-1234-1234-1234567890a2"
#define NOTIFY_CHAR_UUID    "12345678-1234-1234-1234-1234567890a3"

// GPIO 핀 설정
const int LED_PIN = 2;
const int RELAY_PIN = 4;

// 트리거 지속 시간 (ms)
const unsigned long TRIGGER_DURATION_MS = 500;

// BLE 상태
BLEServer* pServer = NULL;
BLECharacteristic* pWriteChar = NULL;
BLECharacteristic* pNotifyChar = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// 콜백: 연결 상태 변경
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("Device connected");
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("Device disconnected");
  }
};

// 콜백: Write Characteristic
class WriteCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) {
    String value = pCharacteristic->getValue();

    if (value.length() > 0) {
      Serial.print("Received: ");
      Serial.println(value.c_str());

      if (value == "PRINT") {
        triggerOutput();

        // Notify로 완료 응답
        if (pNotifyChar != NULL && deviceConnected) {
          pNotifyChar->setValue("DONE");
          pNotifyChar->notify();
          Serial.println("Sent DONE notification");
        }
      }
    }
  }
};

void triggerOutput() {
  Serial.println("Triggering output...");

  // LED와 릴레이 ON
  digitalWrite(LED_PIN, HIGH);
  digitalWrite(RELAY_PIN, HIGH);

  delay(TRIGGER_DURATION_MS);

  // LED와 릴레이 OFF
  digitalWrite(LED_PIN, LOW);
  digitalWrite(RELAY_PIN, LOW);

  Serial.println("Trigger complete");
}

void setup() {
  Serial.begin(115200);
  Serial.println("Starting BLE Server...");

  // GPIO 설정
  pinMode(LED_PIN, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(RELAY_PIN, LOW);

  // BLE 초기화
  BLEDevice::init("PhotoCard-ESP32");

  // BLE Server 생성
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  // BLE Service 생성
  BLEService* pService = pServer->createService(SERVICE_UUID);

  // Write Characteristic 생성
  pWriteChar = pService->createCharacteristic(
    WRITE_CHAR_UUID,
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_WRITE_NR
  );
  pWriteChar->setCallbacks(new WriteCallbacks());

  // Notify Characteristic 생성
  pNotifyChar = pService->createCharacteristic(
    NOTIFY_CHAR_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pNotifyChar->addDescriptor(new BLE2902());

  // Service 시작
  pService->start();

  // Advertising 시작
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("BLE Server is ready!");
  Serial.println("Waiting for connections...");
}

void loop() {
  // 연결 해제 시 광고 재시작
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("Advertising restarted");
    oldDeviceConnected = deviceConnected;
  }

  // 연결 상태 업데이트
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  delay(10);
}
