// EGBLE Controller - scene system
//
// A scene is a named snapshot of the whole controller: for each channel its
// enabled flag, group, calibration scale and pattern. Scenes are stored in NVS
// so they survive a reboot, which matters because the controller is expected
// to run standalone without a phone attached.
//
// Five example scenes ship built in (Bike Vest, Retail Sequence, SOS, All On,
// All Off) and can be recalled by name even on a fresh device.

#pragma once

#include "Pattern.h"
#include "PatternEngine.h"
#include "config.h"
#include <stdint.h>
#include <stddef.h>   // size_t (used by slotName below)

struct ChannelSnapshot {
  bool          enabled = true;
  uint8_t       groupId = 0;
  uint8_t       scale   = 100;
  PatternConfig cfg;
};

struct Scene {
  char            name[24] = {0};
  ChannelSnapshot ch[NUM_CHANNELS];
};

// Number of writable user scene slots stored in NVS.
static const uint8_t MAX_SCENE_SLOTS = 8;

class SceneManager {
public:
  void begin();

  // Capture the engine's current state into a scene with the given name.
  Scene capture(const PatternEngine& eng, const char* name) const;

  // Apply a scene to the engine.
  void  apply(PatternEngine& eng, const Scene& scene) const;

  // ---- User slots (NVS) ----
  bool saveSlot(uint8_t slot, const Scene& scene);
  bool loadSlot(uint8_t slot, Scene& out);
  bool deleteSlot(uint8_t slot);
  bool slotUsed(uint8_t slot) const;
  // Copy the stored slot name into out (empty string if unused).
  void slotName(uint8_t slot, char* out, size_t outLen) const;

  // ---- Built-in scenes ----
  // Fill out with a built-in by name (case-insensitive). Returns false if the
  // name does not match a built-in.
  static bool builtin(const char* name, Scene& out);
  static uint8_t builtinCount();
  static const char* builtinName(uint8_t index);

private:
  uint16_t usedMask_ = 0;  // bit i set = slot i used
  void     writeMask_();
};
