#include "PatternEngine.h"
#include <Arduino.h>
#include <esp_random.h>   // esp_random() for seeding the FLAME flicker

void PatternEngine::begin() {
  randomSeed(esp_random());   // vary the FLAME flicker between boots
  for (uint8_t i = 0; i < NUM_CHANNELS; i++) {
    chan_[i].begin(CHANNEL_PINS[i]);
    rt_[i] = ChannelRuntime{};
    rt_[i].cfg.type = PAT_OFF;
  }
  lastTick_ = 0;
}

void PatternEngine::tick(uint32_t nowMs) {
  if (lastTick_ != 0 && (nowMs - lastTick_) < TICK_INTERVAL_MS) return;
  lastTick_ = nowMs == 0 ? 1 : nowMs;  // never store 0 (used as "first run")

  for (uint8_t i = 0; i < NUM_CHANNELS; i++) {
    if (rt_[i].rawOverride >= 0) {
      chan_[i].setRawDuty((uint16_t)rt_[i].rawOverride);
      continue;
    }
    if (!rt_[i].enabled) {
      chan_[i].setBrightness(0);
      continue;
    }
    if (rt_[i].cfg.type == PAT_FLAME) {
      updateFlame(i, nowMs);
      chan_[i].setBrightness(rt_[i].flameLevel);
      continue;
    }
    chan_[i].setBrightness(computeLevel(i, nowMs));
  }
}

// FLAME: a candle-like flicker. Every interval, pick a new random target
// between about 45 and 100 percent of the cap, then ease toward it each tick so
// the motion is soft rather than jumpy. onMs sets the flicker speed (smaller is
// livelier), bri sets the ceiling. Gamma still applies downstream.
void PatternEngine::updateFlame(uint8_t ch, uint32_t nowMs) {
  ChannelRuntime& rt = rt_[ch];
  const PatternConfig& c = rt.cfg;
  uint16_t interval = c.onMs ? c.onMs : 80;
  if (nowMs >= rt.flameNextMs) {
    uint8_t lo   = (uint16_t)c.bri * 45 / 100;
    uint8_t span = c.bri > lo ? c.bri - lo : 0;
    rt.flameTarget = lo + (span ? (uint8_t)random(span + 1) : 0);
    rt.flameNextMs = nowMs + interval / 2 + (uint32_t)random(interval);
  }
  int delta = (int)rt.flameTarget - (int)rt.flameLevel;
  int step  = delta / 4;
  if (step == 0 && delta != 0) step = (delta > 0) ? 1 : -1;
  int nl = (int)rt.flameLevel + step;
  if (nl < 0)   nl = 0;
  if (nl > 255) nl = 255;
  rt.flameLevel = (uint8_t)nl;
}

// Scale a brightness cap by a 0..1 fraction expressed as num/den.
static inline uint8_t frac(uint8_t bri, uint32_t num, uint32_t den) {
  if (den == 0) return bri;
  uint32_t v = (uint32_t)bri * num / den;
  return v > 255 ? 255 : (uint8_t)v;
}

uint8_t PatternEngine::computeLevel(uint8_t ch, uint32_t nowMs) const {
  const PatternConfig& c = rt_[ch].cfg;
  const uint32_t t = nowMs - rt_[ch].startMs;

  switch (c.type) {
    case PAT_OFF:
      return 0;

    case PAT_SOLID:
      return c.bri;

    case PAT_BLINK:
    case PAT_TURN_SIGNAL: {
      uint32_t period = (uint32_t)c.onMs + c.offMs;
      if (period == 0) return c.bri;
      uint32_t ph = t % period;
      return ph < c.onMs ? c.bri : 0;
    }

    case PAT_FADE_PULSE: {
      uint32_t period = (uint32_t)c.fadeInMs + c.holdMs + c.fadeOutMs + c.gapMs;
      if (period == 0) return c.bri;
      uint32_t ph = t % period;
      if (ph < c.fadeInMs) {
        return frac(c.bri, ph, c.fadeInMs);
      }
      ph -= c.fadeInMs;
      if (ph < c.holdMs) {
        return c.bri;
      }
      ph -= c.holdMs;
      if (ph < c.fadeOutMs) {
        return frac(c.bri, c.fadeOutMs - ph, c.fadeOutMs);
      }
      return 0;  // gap
    }

    case PAT_SOS: {
      // Morse SOS. unit = onMs. dot = 1 unit on, dash = 3 units on.
      // Intra-letter gap = 1 unit, inter-letter gap = 3 units,
      // word gap (before repeat) = 7 units.
      // Schedule expressed as {duration in units, on}.
      static const struct { uint8_t units; uint8_t on; } SEG[] = {
        {1,1},{1,0},{1,1},{1,0},{1,1},   // S
        {3,0},                            // letter gap
        {3,1},{1,0},{3,1},{1,0},{3,1},   // O
        {3,0},                            // letter gap
        {1,1},{1,0},{1,1},{1,0},{1,1},   // S
        {7,0},                            // word gap
      };
      const uint32_t unit = c.onMs == 0 ? 1 : c.onMs;
      uint32_t totalUnits = 0;
      for (auto& s : SEG) totalUnits += s.units;
      uint32_t pos = t % (totalUnits * unit);
      uint32_t acc = 0;
      for (auto& s : SEG) {
        acc += (uint32_t)s.units * unit;
        if (pos < acc) return s.on ? c.bri : 0;
      }
      return 0;
    }

    case PAT_SEQUENCE: {
      uint8_t k = 0, n = 0;
      groupPosition(ch, k, n);
      if (n == 0 || c.stepMs == 0) return 0;
      uint32_t period = (uint32_t)n * c.stepMs;
      uint32_t pos    = nowMs % period;  // shared clock keeps members in sync
      uint32_t start  = (uint32_t)k * c.stepMs;
      uint32_t window = (uint32_t)c.stepMs + c.overlapMs;
      uint32_t end    = start + window;
      bool on = (pos >= start && pos < end);
      if (!on && end > period) {
        // Window wraps past the period boundary.
        on = pos < (end - period);
      }
      return on ? c.bri : 0;
    }

    default:
      return 0;
  }
}

void PatternEngine::groupPosition(uint8_t ch, uint8_t& position, uint8_t& memberCount) const {
  uint8_t gid = rt_[ch].groupId;
  position = 0;
  memberCount = 0;
  for (uint8_t i = 0; i < NUM_CHANNELS; i++) {
    if (rt_[i].enabled && rt_[i].groupId == gid && rt_[i].cfg.type == PAT_SEQUENCE) {
      if (i < ch) position++;
      memberCount++;
    }
  }
}

void PatternEngine::setPattern(uint8_t ch, const PatternConfig& cfg) {
  if (ch >= NUM_CHANNELS) return;
  rt_[ch].cfg = cfg;
  rt_[ch].startMs = millis();
  rt_[ch].rawOverride = -1;  // a real pattern clears any bench override
  rt_[ch].flameNextMs = 0;   // re-seed flicker if this is a FLAME
  rt_[ch].flameLevel  = 0;
  markDirty();
}

void PatternEngine::setRawDuty(uint8_t ch, uint16_t duty) {
  if (ch >= NUM_CHANNELS) return;
  rt_[ch].rawOverride = (int16_t)(duty > PWM_MAX_DUTY ? PWM_MAX_DUTY : duty);
  markDirty();
}

void PatternEngine::setPatternGroup(uint8_t groupId, const PatternConfig& cfg) {
  uint32_t now = millis();
  for (uint8_t i = 0; i < NUM_CHANNELS; i++) {
    if (rt_[i].groupId == groupId) {
      rt_[i].cfg = cfg;
      rt_[i].startMs = now;
      rt_[i].rawOverride = -1;
      rt_[i].flameNextMs = 0;
      rt_[i].flameLevel  = 0;
    }
  }
  markDirty();
}

void PatternEngine::setPatternAll(const PatternConfig& cfg) {
  uint32_t now = millis();
  for (uint8_t i = 0; i < NUM_CHANNELS; i++) {
    rt_[i].cfg = cfg;
    rt_[i].startMs = now;
    rt_[i].rawOverride = -1;
    rt_[i].flameNextMs = 0;
    rt_[i].flameLevel  = 0;
  }
  markDirty();
}

void PatternEngine::setEnabled(uint8_t ch, bool on) {
  if (ch >= NUM_CHANNELS) return;
  rt_[ch].enabled = on;
  markDirty();
}

void PatternEngine::setGroup(uint8_t ch, uint8_t groupId) {
  if (ch >= NUM_CHANNELS) return;
  rt_[ch].groupId = groupId;
  markDirty();
}

void PatternEngine::setScale(uint8_t ch, uint8_t scalePct) {
  if (ch >= NUM_CHANNELS) return;
  chan_[ch].setScale(scalePct);
  markDirty();
}
