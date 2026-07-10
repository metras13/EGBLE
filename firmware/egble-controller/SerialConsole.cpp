#include "SerialConsole.h"
#include "Protocol.h"
#include <Arduino.h>
#include <string.h>
#include <stdlib.h>

// Milliseconds between steps of the gamma sweep test.
static const uint32_t SWEEP_STEP_MS = 8;

void SerialConsole::begin(PatternEngine& eng, SceneManager& scenes, BleService& ble) {
  eng_    = &eng;
  scenes_ = &scenes;
  ble_    = &ble;
  len_    = 0;
  Serial.println();
  Serial.println("EGBLE controller ready. Type 'help' for commands.");
}

void SerialConsole::update(uint32_t nowMs) {
  // Advance the gamma sweep if running.
  if (sweepActive_ && (nowMs - sweepLast_) >= SWEEP_STEP_MS) {
    sweepLast_ = nowMs;
    sweepLevel_ += sweepDir_;
    if (sweepLevel_ >= 255) { sweepLevel_ = 255; sweepDir_ = -1; }
    else if (sweepLevel_ <= 0) { sweepLevel_ = 0; sweepDir_ = 1; sweepActive_ = false; }
    PatternConfig c;
    c.type = PAT_SOLID;
    c.bri  = (uint8_t)sweepLevel_;
    eng_->setPattern(sweepCh_, c);
    if (!sweepActive_) Serial.println("[sweep] done");
  }

  // Read serial input line by line.
  while (Serial.available()) {
    char ch = (char)Serial.read();
    if (ch == '\r') continue;
    if (ch == '\n') {
      buf_[len_] = '\0';
      if (len_ > 0) handleLine(buf_);
      len_ = 0;
    } else if (len_ < sizeof(buf_) - 1) {
      buf_[len_++] = ch;
    }
  }
}

void SerialConsole::handleLine(char* line) {
  // JSON passthrough: same schema as the BLE command characteristic.
  if (line[0] == '{') {
    ProtocolResult r = handleCommand(line, *eng_, *scenes_);
    Serial.printf("-> %s\n", r.msg);
    if (r.changed && ble_) ble_->notifyState();
    return;
  }

  char* cmd = strtok(line, " ");
  if (!cmd) return;

  if (strcmp(cmd, "help") == 0) { printHelp(); return; }
  if (strcmp(cmd, "state") == 0) { printState(); return; }

  if (strcmp(cmd, "scenes") == 0) {
    Serial.println("Built-in scenes:");
    for (uint8_t i = 0; i < SceneManager::builtinCount(); i++)
      Serial.printf("  %s\n", SceneManager::builtinName(i));
    Serial.println("Saved slots:");
    for (uint8_t i = 0; i < MAX_SCENE_SLOTS; i++) {
      char name[24];
      scenes_->slotName(i, name, sizeof(name));
      Serial.printf("  [%u] %s\n", i, scenes_->slotUsed(i) ? name : "(empty)");
    }
    return;
  }

  if (strcmp(cmd, "recall") == 0) {
    char* name = strtok(nullptr, "");  // rest of line (names have spaces)
    Scene s;
    if (name && SceneManager::builtin(name, s)) {
      scenes_->apply(*eng_, s);
      if (ble_) ble_->notifyState();
      Serial.printf("recalled %s\n", name);
    } else {
      Serial.println("no such built-in");
    }
    return;
  }

  if (strcmp(cmd, "raw") == 0) {
    char* a = strtok(nullptr, " ");
    char* b = strtok(nullptr, " ");
    if (a && b) {
      eng_->setRawDuty((uint8_t)atoi(a), (uint16_t)atoi(b));
      Serial.printf("raw ch%d duty %d\n", atoi(a), atoi(b));
    } else Serial.println("usage: raw <ch> <duty 0-1023>");
    return;
  }

  if (strcmp(cmd, "level") == 0) {
    char* a = strtok(nullptr, " ");
    char* b = strtok(nullptr, " ");
    if (a && b) {
      PatternConfig c; c.type = PAT_SOLID; c.bri = (uint8_t)constrain(atoi(b), 0, 255);
      eng_->setPattern((uint8_t)atoi(a), c);
      if (ble_) ble_->notifyState();
      Serial.printf("level ch%d = %d\n", atoi(a), atoi(b));
    } else Serial.println("usage: level <ch> <0-255>");
    return;
  }

  if (strcmp(cmd, "sweep") == 0) {
    char* a = strtok(nullptr, " ");
    sweepCh_ = a ? (uint8_t)atoi(a) : 0;
    sweepLevel_ = 0; sweepDir_ = 1; sweepActive_ = true; sweepLast_ = 0;
    Serial.printf("[sweep] ramping ch%u up then down\n", sweepCh_);
    return;
  }

  if (strcmp(cmd, "fade") == 0) {
    // Shorthand for the first bench test: the 6 second on to off fade.
    Scene s;
    if (SceneManager::builtin("Fade 6s", s)) {
      scenes_->apply(*eng_, s);
      if (ble_) ble_->notifyState();
      Serial.println("fade 6s on all channels");
    }
    return;
  }

  if (strcmp(cmd, "off") == 0) {
    PatternConfig c; c.type = PAT_OFF;
    eng_->setPatternAll(c);
    if (ble_) ble_->notifyState();
    Serial.println("all off");
    return;
  }

  Serial.println("unknown command, type 'help'");
}

void SerialConsole::printHelp() {
  Serial.println();
  Serial.println("EGBLE serial console");
  Serial.println("  help                 this list");
  Serial.println("  state                dump per-channel state");
  Serial.println("  scenes               list built-in scenes and saved slots");
  Serial.println("  recall <name>        apply a built-in scene by name");
  Serial.println("  fade                 6 second on to off fade on all channels");
  Serial.println("  level <ch> <0-255>   set a channel to a solid brightness");
  Serial.println("  sweep <ch>           gamma fade sweep to eyeball smoothness");
  Serial.println("  raw <ch> <0-1023>    write raw PWM duty, gamma bypassed");
  Serial.println("  off                  all channels off");
  Serial.println("  { ... }              raw JSON command (see docs/protocol.md)");
  Serial.println();
}

void SerialConsole::printState() {
  static char buf[512];
  buildState(buf, sizeof(buf), *eng_);
  Serial.println(buf);
}
