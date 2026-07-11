#include "BleService.h"
#include "Protocol.h"
#include <NimBLEDevice.h>
#include <Arduino.h>

// Live-state notify period. Fast enough to feel responsive in the app, slow
// enough to leave the radio idle most of the time.
static const uint32_t LIVE_NOTIFY_MS = 400;

static NimBLEServer*         g_server    = nullptr;
static NimBLECharacteristic* g_stateChar = nullptr;
static NimBLECharacteristic* g_sceneChar = nullptr;
static BleService*           g_self      = nullptr;

// Callback signatures follow NimBLE-Arduino 2.x (the version that pairs with
// ESP32 Arduino core 3.x). The extra NimBLEConnInfo / reason parameters are what
// distinguish the 2.x API from 1.4.x.

// Connection bookkeeping so the device keeps advertising after a disconnect.
class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* server, NimBLEConnInfo& connInfo) override {
    Serial.println("[ble] connected");
  }
  void onDisconnect(NimBLEServer* server, NimBLEConnInfo& connInfo, int reason) override {
    Serial.println("[ble] disconnected, re-advertising");
    NimBLEDevice::startAdvertising();
  }
};

class CommandCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo& connInfo) override {
    if (g_self) g_self->onCommandWrite(c->getValue().c_str());
  }
};

class SceneCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo& connInfo) override {
    if (g_self) g_self->onSceneWrite(c->getValue().c_str());
  }
};

void BleService::begin(const char* deviceName, PatternEngine& eng, SceneManager& scenes) {
  eng_    = &eng;
  scenes_ = &scenes;
  g_self  = this;

  NimBLEDevice::init(deviceName);
  // Leave TX power at the default. If a marginal SuperMini regulator browns out
  // under radio current, lower it with NimBLEDevice::setPower(3) (2.x takes dBm).

  g_server = NimBLEDevice::createServer();
  g_server->setCallbacks(new ServerCallbacks());

  NimBLEService* svc = g_server->createService(EGBLE_SERVICE_UUID);

  NimBLECharacteristic* cmd = svc->createCharacteristic(
      EGBLE_CMD_UUID,
      NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
  cmd->setCallbacks(new CommandCallbacks());

  g_stateChar = svc->createCharacteristic(
      EGBLE_STATE_UUID,
      NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);

  g_sceneChar = svc->createCharacteristic(
      EGBLE_SCENE_UUID,
      NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE);
  g_sceneChar->setCallbacks(new SceneCallbacks());

  svc->start();

  refreshSceneChar();
  notifyState();

  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(EGBLE_SERVICE_UUID);
  adv->enableScanResponse(true);   // 2.x name for setScanResponse
  adv->start();

  Serial.printf("[ble] advertising as \"%s\"\n", deviceName);
}

void BleService::onCommandWrite(const char* json) {
  if (!eng_ || !scenes_) return;
  ProtocolResult r = handleCommand(json, *eng_, *scenes_);
  Serial.printf("[ble] cmd: %s -> %s\n", json, r.msg);
  if (r.changed) notifyState();
}

void BleService::onSceneWrite(const char* json) {
  if (!eng_ || !scenes_) return;
  ProtocolResult r = handleCommand(json, *eng_, *scenes_);
  Serial.printf("[ble] scene: %s -> %s\n", json, r.msg);
  refreshSceneChar();
  if (r.changed) notifyState();
}

void BleService::refreshSceneChar() {
  if (!g_sceneChar || !scenes_) return;
  static char buf[512];
  size_t n = buildScenes(buf, sizeof(buf), *scenes_);
  g_sceneChar->setValue((uint8_t*)buf, n);
}

void BleService::notifyState() {
  if (!g_stateChar || !eng_) return;
  static char buf[512];
  size_t n = buildState(buf, sizeof(buf), *eng_);
  g_stateChar->setValue((uint8_t*)buf, n);
  g_stateChar->notify();
}

void BleService::update(uint32_t nowMs) {
  if (!isConnected()) return;
  if (nowMs - lastLiveNotify_ < LIVE_NOTIFY_MS) return;
  lastLiveNotify_ = nowMs;
  notifyState();
}

bool BleService::isConnected() const {
  return g_server && g_server->getConnectedCount() > 0;
}
