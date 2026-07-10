// EGBLE Controller - serial command console
//
// A temporary bench interface so patterns can be driven over USB before BLE or
// the app exist. This decouples firmware testing from app testing: Phase 1 and
// 2 of the build plan happen entirely here.
//
// Any line starting with '{' is treated as a raw JSON command (the same schema
// the BLE command characteristic accepts). Everything else is a friendly
// shorthand. Type "help" for the list.

#pragma once

#include "PatternEngine.h"
#include "Scenes.h"
#include "BleService.h"
#include <stdint.h>

class SerialConsole {
public:
  void begin(PatternEngine& eng, SceneManager& scenes, BleService& ble);
  void update(uint32_t nowMs);

private:
  void handleLine(char* line);
  void printHelp();
  void printState();

  PatternEngine* eng_    = nullptr;
  SceneManager*  scenes_ = nullptr;
  BleService*    ble_    = nullptr;

  char    buf_[160];
  uint8_t len_ = 0;

  // Non-blocking gamma sweep used to eyeball fade smoothness on the bench.
  bool     sweepActive_ = false;
  uint8_t  sweepCh_     = 0;
  int16_t  sweepLevel_  = 0;
  int8_t   sweepDir_    = 1;
  uint32_t sweepLast_   = 0;
};
