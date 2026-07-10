#include "Protocol.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include <string.h>
#include <strings.h>

// Fill a PatternConfig from a command object. Only fields present in the JSON
// override the defaults, so a caller can send just the ones they care about.
static PatternConfig configFromJson(JsonObjectConst o) {
  PatternConfig c;
  const char* typeName = o["type"] | "";
  PatternType t = patternFromName(typeName);
  if (t != PAT_COUNT) c.type = t;

  if (o["bri"].is<int>())       c.bri       = (uint8_t)constrain(o["bri"].as<int>(), 0, 255);
  if (o["onMs"].is<int>())      c.onMs      = (uint16_t)o["onMs"].as<int>();
  if (o["offMs"].is<int>())     c.offMs     = (uint16_t)o["offMs"].as<int>();
  if (o["fadeInMs"].is<int>())  c.fadeInMs  = (uint16_t)o["fadeInMs"].as<int>();
  if (o["holdMs"].is<int>())    c.holdMs    = (uint16_t)o["holdMs"].as<int>();
  if (o["fadeOutMs"].is<int>()) c.fadeOutMs = (uint16_t)o["fadeOutMs"].as<int>();
  if (o["gapMs"].is<int>())     c.gapMs     = (uint16_t)o["gapMs"].as<int>();
  if (o["stepMs"].is<int>())    c.stepMs    = (uint16_t)o["stepMs"].as<int>();
  if (o["overlapMs"].is<int>()) c.overlapMs = (uint16_t)o["overlapMs"].as<int>();
  return c;
}

static ProtocolResult ack(bool changed, bool ok, const char* msg) {
  ProtocolResult r;
  r.changed = changed;
  r.ok = ok;
  strncpy(r.msg, msg, sizeof(r.msg) - 1);
  return r;
}

ProtocolResult handleCommand(const char* json, PatternEngine& eng, SceneManager& scenes) {
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, json);
  if (err) return ack(false, false, "bad json");

  const char* cmd = doc["cmd"] | "";

  if (strcmp(cmd, "pattern") == 0) {
    PatternConfig c = configFromJson(doc.as<JsonObjectConst>());
    if (doc["all"].is<bool>() && doc["all"].as<bool>()) {
      eng.setPatternAll(c);
      return ack(true, true, "pattern all");
    }
    if (doc["grp"].is<int>()) {
      eng.setPatternGroup((uint8_t)doc["grp"].as<int>(), c);
      return ack(true, true, "pattern group");
    }
    if (doc["ch"].is<int>()) {
      int ch = doc["ch"].as<int>();
      if (ch < 0 || ch >= eng.count()) return ack(false, false, "bad ch");
      eng.setPattern((uint8_t)ch, c);
      return ack(true, true, "pattern ch");
    }
    return ack(false, false, "no target");
  }

  if (strcmp(cmd, "enable") == 0) {
    int ch = doc["ch"] | -1;
    if (ch < 0 || ch >= eng.count()) return ack(false, false, "bad ch");
    eng.setEnabled((uint8_t)ch, doc["on"] | true);
    return ack(true, true, "enable");
  }

  if (strcmp(cmd, "group") == 0) {
    int ch = doc["ch"] | -1;
    if (ch < 0 || ch >= eng.count()) return ack(false, false, "bad ch");
    eng.setGroup((uint8_t)ch, (uint8_t)(doc["gid"] | 0));
    return ack(true, true, "group");
  }

  if (strcmp(cmd, "scale") == 0) {
    int ch = doc["ch"] | -1;
    if (ch < 0 || ch >= eng.count()) return ack(false, false, "bad ch");
    eng.setScale((uint8_t)ch, (uint8_t)constrain((int)(doc["pct"] | 100), 0, 100));
    return ack(true, true, "scale");
  }

  if (strcmp(cmd, "scene") == 0) {
    const char* action = doc["action"] | "";
    if (strcmp(action, "save") == 0) {
      int slot = doc["slot"] | -1;
      if (slot < 0 || slot >= MAX_SCENE_SLOTS) return ack(false, false, "bad slot");
      Scene s = scenes.capture(eng, doc["name"] | "Scene");
      bool ok = scenes.saveSlot((uint8_t)slot, s);
      return ack(false, ok, ok ? "scene saved" : "save failed");
    }
    if (strcmp(action, "load") == 0) {
      int slot = doc["slot"] | -1;
      Scene s;
      if (slot < 0 || slot >= MAX_SCENE_SLOTS || !scenes.loadSlot((uint8_t)slot, s))
        return ack(false, false, "load failed");
      scenes.apply(eng, s);
      return ack(true, true, "scene loaded");
    }
    if (strcmp(action, "delete") == 0) {
      int slot = doc["slot"] | -1;
      if (slot < 0 || slot >= MAX_SCENE_SLOTS) return ack(false, false, "bad slot");
      scenes.deleteSlot((uint8_t)slot);
      return ack(false, true, "scene deleted");
    }
    if (strcmp(action, "recall") == 0) {
      Scene s;
      if (!SceneManager::builtin(doc["name"] | "", s)) return ack(false, false, "no builtin");
      scenes.apply(eng, s);
      return ack(true, true, "builtin recalled");
    }
    return ack(false, false, "bad action");
  }

  if (strcmp(cmd, "trigger") == 0) {
    const char* action = doc["action"] | "";
    PatternConfig c;
    if (strcmp(action, "sos") == 0) {
      c.type = PAT_SOS; c.bri = 255; c.onMs = 200;
      eng.setPatternAll(c);
      return ack(true, true, "trigger sos");
    }
    if (strcmp(action, "left") == 0 || strcmp(action, "right") == 0) {
      c.type = PAT_TURN_SIGNAL; c.bri = 255; c.onMs = 180; c.offMs = 180;
      eng.setPatternAll(c);
      return ack(true, true, "trigger turn");
    }
    if (strcmp(action, "stop") == 0 || strcmp(action, "off") == 0) {
      c.type = PAT_OFF;
      eng.setPatternAll(c);
      return ack(true, true, "trigger stop");
    }
    return ack(false, false, "bad action");
  }

  if (strcmp(cmd, "get") == 0) {
    return ack(true, true, "get");  // caller pushes state
  }

  return ack(false, false, "unknown cmd");
}

size_t buildState(char* out, size_t outLen, const PatternEngine& eng) {
  JsonDocument doc;
  doc["v"] = FW_VERSION;
  JsonArray arr = doc["ch"].to<JsonArray>();
  for (uint8_t i = 0; i < eng.count(); i++) {
    const ChannelRuntime& rt = eng.runtime(i);
    JsonObject o = arr.add<JsonObject>();
    o["e"]   = rt.enabled ? 1 : 0;
    o["g"]   = rt.groupId;
    o["p"]   = patternName(rt.cfg.type);
    o["bri"] = rt.cfg.bri;
    o["sc"]  = eng.scale(i);
    o["lvl"] = eng.currentLevel(i);
  }
  return serializeJson(doc, out, outLen);
}

size_t buildScenes(char* out, size_t outLen, const SceneManager& scenes) {
  JsonDocument doc;
  JsonArray builtins = doc["builtin"].to<JsonArray>();
  for (uint8_t i = 0; i < SceneManager::builtinCount(); i++) {
    builtins.add(SceneManager::builtinName(i));
  }
  JsonArray slots = doc["slots"].to<JsonArray>();
  for (uint8_t i = 0; i < MAX_SCENE_SLOTS; i++) {
    JsonObject o = slots.add<JsonObject>();
    o["slot"] = i;
    if (scenes.slotUsed(i)) {
      char name[24];
      scenes.slotName(i, name, sizeof(name));
      o["name"] = name;
    } else {
      o["name"] = nullptr;
    }
  }
  return serializeJson(doc, out, outLen);
}
