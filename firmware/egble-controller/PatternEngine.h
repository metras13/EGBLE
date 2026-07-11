// EGBLE Controller - pattern engine
//
// Owns the six channels and their runtime state. Every channel runs its own
// non-blocking pattern state machine, advanced on a fixed tick. Patterns keep
// running here on the device whether or not a phone is connected, which is the
// whole point for the bike-vest safety case.

#pragma once

#include "Channel.h"
#include "Pattern.h"
#include "config.h"
#include <stdint.h>

struct ChannelRuntime {
  bool          enabled  = true;
  uint8_t       groupId  = 0;      // 0 = ungrouped
  PatternConfig cfg;               // current pattern (defaults to OFF)
  uint32_t      startMs  = 0;      // when the current pattern began
  int16_t       rawOverride = -1;  // >=0 holds a raw duty for bench calibration
  // FLAME runtime (stateful flicker, unlike the stateless time-based patterns)
  uint8_t       flameLevel  = 0;
  uint8_t       flameTarget = 0;
  uint32_t      flameNextMs = 0;
};

class PatternEngine {
public:
  void begin();

  // Advance every channel. Call as often as you like; work is gated to
  // TICK_INTERVAL_MS internally so the caller can spin freely.
  void tick(uint32_t nowMs);

  // ---- Pattern assignment ----
  void setPattern(uint8_t ch, const PatternConfig& cfg);
  void setPatternGroup(uint8_t groupId, const PatternConfig& cfg);
  void setPatternAll(const PatternConfig& cfg);

  // ---- Channel management ----
  void setEnabled(uint8_t ch, bool on);
  void setGroup(uint8_t ch, uint8_t groupId);
  void setScale(uint8_t ch, uint8_t scalePct);

  // Bench calibration: hold a raw PWM duty (0..1023, gamma bypassed) on a
  // channel until a pattern is assigned to it again. Used by the serial
  // console to tune PWM frequency and confirm the gamma curve.
  void setRawDuty(uint8_t ch, uint16_t duty);

  // ---- State access (for BLE/serial reporting) ----
  uint8_t              count() const { return NUM_CHANNELS; }
  const ChannelRuntime& runtime(uint8_t ch) const { return rt_[ch]; }
  uint8_t              scale(uint8_t ch) const { return chan_[ch].scale(); }
  uint8_t              currentLevel(uint8_t ch) const { return chan_[ch].level(); }

  // Force an immediate recompute+write on the next tick call.
  void markDirty() { lastTick_ = 0; }

private:
  uint8_t computeLevel(uint8_t ch, uint32_t nowMs) const;
  // FLAME is stateful, so it updates rt_ directly rather than through the
  // const, purely time-based computeLevel path.
  void    updateFlame(uint8_t ch, uint32_t nowMs);
  // Sequence helper: number of enabled members of a group and this channel's
  // position within it (ascending channel order).
  void groupPosition(uint8_t ch, uint8_t& position, uint8_t& memberCount) const;

  Channel        chan_[NUM_CHANNELS];
  ChannelRuntime rt_[NUM_CHANNELS];
  uint32_t       lastTick_ = 0;
};
