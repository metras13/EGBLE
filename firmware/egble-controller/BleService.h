// EGBLE Controller - BLE GATT service
//
// Exposes three characteristics on one service:
//   Command (write)        app writes a JSON command packet
//   State   (read/notify)  per-channel state so the app UI stays truthful
//   Scene   (write/read)   scene save/load/recall plus the scene list
//
// The GATT layer only moves bytes. All behavior lives in Protocol/PatternEngine,
// so patterns keep running on the device regardless of connection state.
//
// UUIDs are mirrored in the React Native app (app/src/ble/uuids.ts) and in
// docs/protocol.md. Keep the three in sync.

#pragma once

#include "PatternEngine.h"
#include "Scenes.h"
#include <stdint.h>

#define EGBLE_SERVICE_UUID  "6b1e0001-8f2a-4c3d-9a1b-2c3d4e5f6071"
#define EGBLE_CMD_UUID      "6b1e0002-8f2a-4c3d-9a1b-2c3d4e5f6071"
#define EGBLE_STATE_UUID    "6b1e0003-8f2a-4c3d-9a1b-2c3d4e5f6071"
#define EGBLE_SCENE_UUID    "6b1e0004-8f2a-4c3d-9a1b-2c3d4e5f6071"

class BleService {
public:
  void begin(const char* deviceName, PatternEngine& eng, SceneManager& scenes);

  // Push the current state to the State characteristic and notify subscribers.
  void notifyState();

  // Call from loop(). Sends a throttled live-state notification so the app can
  // show real-time channel levels without the firmware spamming the radio.
  void update(uint32_t nowMs);

  bool isConnected() const;

  // Internal helpers used by the characteristic callbacks.
  void onCommandWrite(const char* json);
  void onSceneWrite(const char* json);
  void refreshSceneChar();

private:
  PatternEngine* eng_    = nullptr;
  SceneManager*  scenes_ = nullptr;
  uint32_t       lastLiveNotify_ = 0;
};
