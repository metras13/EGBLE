// EGBLE Controller - command protocol (compact JSON)
//
// v1 uses compact JSON on the wire. It is easy to debug from nRF Connect or a
// serial terminal, and a 6-channel controller does not send enough traffic for
// the size overhead to matter. The schema is documented in docs/protocol.md.
// If BLE throughput ever becomes a problem the same commands can be re-encoded
// as a binary packet without changing the engine.
//
// Command shapes (one JSON object per write):
//   {"cmd":"pattern","ch":0,"type":"FADE_PULSE","bri":255,"fadeInMs":600,...}
//   {"cmd":"pattern","all":true,"type":"SOLID","bri":180}
//   {"cmd":"pattern","grp":1,"type":"SEQUENCE","stepMs":220,"overlapMs":90}
//   {"cmd":"enable","ch":0,"on":true}
//   {"cmd":"group","ch":0,"gid":1}
//   {"cmd":"scale","ch":0,"pct":80}
//   {"cmd":"scene","action":"save","slot":0,"name":"My Scene"}
//   {"cmd":"scene","action":"load","slot":0}
//   {"cmd":"scene","action":"delete","slot":0}
//   {"cmd":"scene","action":"recall","name":"Bike Vest"}   (built-in)
//   {"cmd":"trigger","action":"sos"}   (left|right|sos|stop)
//   {"cmd":"get"}

#pragma once

#include "PatternEngine.h"
#include "Scenes.h"
#include <stddef.h>

struct ProtocolResult {
  bool changed = false;   // true if engine/scene state was mutated
  bool ok      = true;    // command parsed and applied
  char msg[48] = {0};     // short human-readable ack for logs
};

// Parse and apply one JSON command. Never blocks.
ProtocolResult handleCommand(const char* json, PatternEngine& eng, SceneManager& scenes);

// Serialize the full per-channel state as compact JSON into out.
// Returns the number of bytes written (excluding the null terminator).
size_t buildState(char* out, size_t outLen, const PatternEngine& eng);

// Serialize the scene list (built-ins plus used NVS slots) as compact JSON.
size_t buildScenes(char* out, size_t outLen, const SceneManager& scenes);
