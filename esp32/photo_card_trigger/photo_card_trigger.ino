/*
 * ESP32 Wi-Fi HTTP Server - Photo Card Trigger
 *
 * HTTP POST /dispense 요청을 받으면 릴레이를 트리거합니다.
 *
 * 핀 연결:
 * - GPIO 2: 내장 LED (테스트용)
 * - GPIO 4: 릴레이 모듈 (실제 운영용)
 *
 * 사용법:
 * 1. Wi-Fi SSID/비밀번호 수정
 * 2. 업로드 후 시리얼 모니터에서 IP 확인
 * 3. curl -X POST http://[IP]/dispense 로 테스트
 */

#include <WiFi.h>
#include <WebServer.h>

// Wi-Fi 설정 - 여기 수정!
const char* ssid = "U+Net90F0_5G";
const char* password = "#6PF3CCB8B";

// GPIO 핀 설정
const int LED_PIN = 2;
const int RELAY_PIN = 4;

// 트리거 지속 시간 (ms)
const unsigned long TRIGGER_DURATION_MS = 300;

// 쿨다운 (연타 방지)
const unsigned long COOLDOWN_MS = 2000;
unsigned long lastTriggerTime = 0;

// HTTP 서버 (포트 80)
WebServer server(80);

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

// CORS 헤더 추가
void setCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

// OPTIONS 요청 처리 (CORS preflight)
void handleOptions() {
  setCorsHeaders();
  server.send(204);
}

// POST /dispense - 배출 트리거
void handleDispense() {
  setCorsHeaders();

  unsigned long now = millis();

  // 쿨다운 체크
  if (now - lastTriggerTime < COOLDOWN_MS) {
    Serial.println("Cooldown active, ignoring request");
    server.send(429, "application/json", "{\"success\":false,\"error\":\"cooldown\"}");
    return;
  }

  lastTriggerTime = now;
  triggerOutput();

  server.send(200, "application/json", "{\"success\":true}");
  Serial.println("Dispense request handled");
}

// GET / - 상태 확인
void handleRoot() {
  setCorsHeaders();

  String json = "{";
  json += "\"status\":\"ready\",";
  json += "\"uptime\":" + String(millis() / 1000) + ",";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\"";
  json += "}";

  server.send(200, "application/json", json);
}

// GET /health - 헬스체크
void handleHealth() {
  setCorsHeaders();
  server.send(200, "application/json", "{\"ok\":true}");
}

// 404 처리
void handleNotFound() {
  setCorsHeaders();
  server.send(404, "application/json", "{\"error\":\"not_found\"}");
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n\nStarting Wi-Fi HTTP Server...");

  // GPIO 설정
  pinMode(LED_PIN, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(RELAY_PIN, LOW);

  // Wi-Fi 연결
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWi-Fi connection failed!");
    Serial.println("Check SSID and password");
    return;
  }

  Serial.println("\nWi-Fi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // LED 깜빡여서 연결 성공 알림
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }

  // HTTP 라우트 설정
  server.on("/", HTTP_GET, handleRoot);
  server.on("/health", HTTP_GET, handleHealth);
  server.on("/dispense", HTTP_POST, handleDispense);
  server.on("/dispense", HTTP_OPTIONS, handleOptions);
  server.onNotFound(handleNotFound);

  // 서버 시작
  server.begin();

  Serial.println("\n=== HTTP Server Ready ===");
  Serial.println("Endpoints:");
  Serial.println("  GET  /         - Status");
  Serial.println("  GET  /health   - Health check");
  Serial.println("  POST /dispense - Trigger dispense");
  Serial.println("========================\n");
}

void loop() {
  server.handleClient();

  // Wi-Fi 재연결
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi disconnected, reconnecting...");
    WiFi.reconnect();
    delay(5000);
  }

  delay(2);
}
