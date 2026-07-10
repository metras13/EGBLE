// EGBLE Controller - main sketch
//
// 6-channel EL inverter dimmer/controller for ESP32-C3-Zero.
//
// Architecture:
//   PatternEngine  owns the 6 LEDC channels and runs a non-blocking pattern
//                  state machine per channel through the gamma table.
//   SceneManager   captures/restores the whole controller to NVS.
//   BleService     exposes a GATT service for the app.
//   SerialConsole  drives everything over USB for bench testing.
//
// Safety note: the ESP32 only drives MOSFET gates. Inverter 5V power comes from
// a separate supply sharing a common ground. See docs/hardware.md.
//
// Libraries required (install via Arduino Library Manager):
//   - NimBLE-Arduino  (tested with 1.4.x)
//   - ArduinoJson     (tested with 7.x)
// Board: "ESP32C3 Dev Module" from the esp32 core 3.x. Enable USB CDC On Boot
// so Serial goes over the native USB port.

#include "config.h"
#include "PatternEngine.h"
#include "Scenes.h"
#include "BleService.h"
#include "SerialConsole.h"

PatternEngine engine;
SceneManager  scenes;
BleService    ble;
SerialConsole console;

// Physical trigger input debounce state.
static bool     lastTrigger = HIGH;
static uint32_t lastTriggerMs = 0;

void setup() {
  Serial.begin(115200);
  // Give the native USB CDC a moment to enumerate, but do not block forever if
  // no host is attached (the controller must run standalone).
  uint32_t start = millis();
  while (!Serial && (millis() - start) < 1500) { delay(10); }

  engine.begin();
  scenes.begin();

  // Boot into the Bike Vest scene so the device is useful with no phone.
  Scene boot;
  if (SceneManager::builtin("Bike Vest", boot)) scenes.apply(engine, boot);

  ble.begin("EGBLE-Controller", engine, scenes);
  console.begin(engine, scenes, ble);

  if (TRIGGER_PIN >= 0) pinMode(TRIGGER_PIN, INPUT_PULLUP);
}

void loop() {
  uint32_t now = millis();

  engine.tick(now);      // advance patterns and write PWM
  console.update(now);   // bench serial commands
  ble.update(now);       // throttled live-state notifications

  // Optional physical trigger: fires the turn-signal pattern on all channels
  // as a hardware test path. Debounced falling edge (active low).
  if (TRIGGER_PIN >= 0) {
    bool level = digitalRead(TRIGGER_PIN);
    if (level == LOW && lastTrigger == HIGH && (now - lastTriggerMs) > 250) {
      lastTriggerMs = now;
      PatternConfig c;
      c.type = PAT_TURN_SIGNAL; c.bri = 255; c.onMs = 180; c.offMs = 180;
      engine.setPatternAll(c);
      ble.notifyState();
      Serial.println("[trigger] turn-signal fired");
    }
    lastTrigger = level;
  }
}
