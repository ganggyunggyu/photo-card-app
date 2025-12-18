#include <WiFi.h>
#include <WebServer.h>

const char* ssid = "U+Net90F0_5G";
const char* password = "#6PF3CCB8B";

WebServer server(80);

static const int RELAY_PIN = 4;
static const unsigned long PULSE_MS = 200;
static const unsigned long COOLDOWN_MS = 1500;

static unsigned long lastDispenseMs = 0;

void handleHealth() {
  server.send(200, "application/json", "{\"ok\":true}");
}

void handleDispense() {
  unsigned long now = millis();
  if (now - lastDispenseMs < COOLDOWN_MS) {
    server.send(429, "application/json", "{\"ok\":false,\"reason\":\"cooldown\"}");
    return;
  }
  lastDispenseMs = now;

  digitalWrite(RELAY_PIN, HIGH);
  delay(PULSE_MS);
  digitalWrite(RELAY_PIN, LOW);

  server.send(200, "application/json", "{\"ok\":true}");
}

void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  Serial.begin(115200);
  delay(300);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
    Serial.print(".");
  }
  Serial.println();

  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  server.on("/health", HTTP_GET, handleHealth);
  server.on("/dispense", HTTP_GET, handleDispense);
  server.begin();

  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();
}
