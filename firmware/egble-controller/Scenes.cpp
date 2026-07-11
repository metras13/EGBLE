#include "Scenes.h"
#include <Preferences.h>
#include <string.h>
#include <strings.h>

static Preferences prefs;

// Keys: "mask" holds the used-slot bitmap, "s0".."s7" hold Scene blobs.
static void slotKey(uint8_t slot, char* out) {
  out[0] = 's';
  out[1] = '0' + slot;
  out[2] = '\0';
}

void SceneManager::begin() {
  prefs.begin(NVS_NAMESPACE, false);
  usedMask_ = prefs.getUShort("mask", 0);
}

void SceneManager::writeMask_() {
  prefs.putUShort("mask", usedMask_);
}

Scene SceneManager::capture(const PatternEngine& eng, const char* name) const {
  Scene s;
  strncpy(s.name, name ? name : "", sizeof(s.name) - 1);
  for (uint8_t i = 0; i < NUM_CHANNELS; i++) {
    const ChannelRuntime& rt = eng.runtime(i);
    s.ch[i].enabled = rt.enabled;
    s.ch[i].groupId = rt.groupId;
    s.ch[i].scale   = eng.scale(i);
    s.ch[i].cfg     = rt.cfg;
  }
  return s;
}

void SceneManager::apply(PatternEngine& eng, const Scene& scene) const {
  for (uint8_t i = 0; i < NUM_CHANNELS; i++) {
    eng.setGroup(i, scene.ch[i].groupId);
    eng.setScale(i, scene.ch[i].scale);
    eng.setEnabled(i, scene.ch[i].enabled);
    eng.setPattern(i, scene.ch[i].cfg);
  }
}

bool SceneManager::saveSlot(uint8_t slot, const Scene& scene) {
  if (slot >= MAX_SCENE_SLOTS) return false;
  char key[4];
  slotKey(slot, key);
  size_t written = prefs.putBytes(key, &scene, sizeof(Scene));
  if (written != sizeof(Scene)) return false;
  usedMask_ |= (1u << slot);
  writeMask_();
  return true;
}

bool SceneManager::loadSlot(uint8_t slot, Scene& out) {
  if (slot >= MAX_SCENE_SLOTS || !slotUsed(slot)) return false;
  char key[4];
  slotKey(slot, key);
  size_t read = prefs.getBytes(key, &out, sizeof(Scene));
  return read == sizeof(Scene);
}

bool SceneManager::deleteSlot(uint8_t slot) {
  if (slot >= MAX_SCENE_SLOTS) return false;
  char key[4];
  slotKey(slot, key);
  prefs.remove(key);
  usedMask_ &= ~(1u << slot);
  writeMask_();
  return true;
}

bool SceneManager::slotUsed(uint8_t slot) const {
  if (slot >= MAX_SCENE_SLOTS) return false;
  return (usedMask_ & (1u << slot)) != 0;
}

void SceneManager::slotName(uint8_t slot, char* out, size_t outLen) const {
  if (outLen == 0) return;
  out[0] = '\0';
  if (!slotUsed(slot)) return;
  char key[4];
  slotKey(slot, key);
  Scene s;
  if (prefs.getBytes(key, &s, sizeof(Scene)) == sizeof(Scene)) {
    strncpy(out, s.name, outLen - 1);
    out[outLen - 1] = '\0';
  }
}

// ---- Built-in scenes ----

namespace {

// Small helpers to build snapshots concisely.
ChannelSnapshot off() {
  ChannelSnapshot c;
  c.enabled = true;
  c.cfg.type = PAT_OFF;
  return c;
}

ChannelSnapshot solid(uint8_t bri) {
  ChannelSnapshot c;
  c.cfg.type = PAT_SOLID;
  c.cfg.bri  = bri;
  return c;
}

// Bike Vest: two groups. Group 1 (channels 0-2) is a steady safety glow.
// Group 2 (channels 3-5) does a slow fade pulse so the vest breathes and
// stays visible. Everything runs on the device with no phone attached.
Scene bikeVest() {
  Scene s;
  strncpy(s.name, "Bike Vest", sizeof(s.name) - 1);
  for (uint8_t i = 0; i < NUM_CHANNELS; i++) {
    s.ch[i].enabled = true;
    if (i < 3) {
      s.ch[i].groupId = 1;
      s.ch[i].cfg.type = PAT_SOLID;
      s.ch[i].cfg.bri  = 200;
    } else {
      s.ch[i].groupId = 2;
      s.ch[i].cfg.type      = PAT_FADE_PULSE;
      s.ch[i].cfg.bri       = 255;
      s.ch[i].cfg.fadeInMs  = 800;
      s.ch[i].cfg.holdMs    = 200;
      s.ch[i].cfg.fadeOutMs = 1000;
      s.ch[i].cfg.gapMs     = 300;
    }
  }
  return s;
}

// Retail Sequence: all six channels chase in order for a display window.
Scene retailSequence() {
  Scene s;
  strncpy(s.name, "Retail Sequence", sizeof(s.name) - 1);
  for (uint8_t i = 0; i < NUM_CHANNELS; i++) {
    s.ch[i].enabled = true;
    s.ch[i].groupId = 1;
    s.ch[i].cfg.type      = PAT_SEQUENCE;
    s.ch[i].cfg.bri       = 255;
    s.ch[i].cfg.stepMs    = 220;
    s.ch[i].cfg.overlapMs = 90;
  }
  return s;
}

// SOS on all channels.
Scene sosAll() {
  Scene s;
  strncpy(s.name, "SOS", sizeof(s.name) - 1);
  for (uint8_t i = 0; i < NUM_CHANNELS; i++) {
    s.ch[i].enabled = true;
    s.ch[i].cfg.type = PAT_SOS;
    s.ch[i].cfg.bri  = 255;
    s.ch[i].cfg.onMs = 200;  // Morse unit
  }
  return s;
}

Scene allOn() {
  Scene s;
  strncpy(s.name, "All On", sizeof(s.name) - 1);
  for (uint8_t i = 0; i < NUM_CHANNELS; i++) s.ch[i] = solid(255);
  return s;
}

Scene allOff() {
  Scene s;
  strncpy(s.name, "All Off", sizeof(s.name) - 1);
  for (uint8_t i = 0; i < NUM_CHANNELS; i++) s.ch[i] = off();
  return s;
}

// Fade 6s: the bench test scene. Every channel breathes symmetrically through
// the gamma ramp, three seconds up and three seconds down, then repeats (a six
// second cycle). Confirms the whole path (PWM, gamma, MOSFET, inverter) in both
// fade directions with no phone attached. For a snap-on then fade-out instead,
// set fadeInMs = 0 and fadeOutMs = 6000.
Scene fade6s() {
  Scene s;
  strncpy(s.name, "Fade 6s", sizeof(s.name) - 1);
  for (uint8_t i = 0; i < NUM_CHANNELS; i++) {
    s.ch[i].enabled = true;
    s.ch[i].cfg.type      = PAT_FADE_PULSE;
    s.ch[i].cfg.bri       = 255;
    s.ch[i].cfg.fadeInMs  = 3000;   // three second fade up
    s.ch[i].cfg.holdMs    = 0;
    s.ch[i].cfg.fadeOutMs = 3000;   // three second fade down
    s.ch[i].cfg.gapMs     = 0;
  }
  return s;
}

const char* const BUILTIN_NAMES[] = {
  "Fade 6s", "Bike Vest", "Retail Sequence", "SOS", "All On", "All Off",
};

}  // namespace

uint8_t SceneManager::builtinCount() {
  return sizeof(BUILTIN_NAMES) / sizeof(BUILTIN_NAMES[0]);
}

const char* SceneManager::builtinName(uint8_t index) {
  if (index >= builtinCount()) return "";
  return BUILTIN_NAMES[index];
}

bool SceneManager::builtin(const char* name, Scene& out) {
  if (!name) return false;
  if (strcasecmp(name, "Fade 6s") == 0)         { out = fade6s();         return true; }
  if (strcasecmp(name, "Bike Vest") == 0)       { out = bikeVest();       return true; }
  if (strcasecmp(name, "Retail Sequence") == 0) { out = retailSequence(); return true; }
  if (strcasecmp(name, "SOS") == 0)             { out = sosAll();         return true; }
  if (strcasecmp(name, "All On") == 0)          { out = allOn();          return true; }
  if (strcasecmp(name, "All Off") == 0)         { out = allOff();         return true; }
  return false;
}
