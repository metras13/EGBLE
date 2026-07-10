// EGBLE Controller - single output channel (LEDC PWM + gamma)
//
// A Channel owns one LEDC PWM output. Callers set a perceptual brightness
// (0..255); the channel expands it through the gamma table and an optional
// per-channel calibration scale before writing raw duty. Keeping the gamma
// and scale here means the rest of the firmware never touches raw duty.

#pragma once

#include <stdint.h>

class Channel {
public:
  // Attach this channel to a GPIO and start its PWM output at zero duty.
  void begin(uint8_t pin);

  // Write a perceptual brightness 0..255. Passes through gamma and the
  // per-channel scale, then writes raw PWM duty.
  void setBrightness(uint8_t level);

  // Write raw PWM duty directly (0..1023). Bypasses gamma. Used only by the
  // bench serial console for calibration sweeps.
  void setRawDuty(uint16_t duty);

  // Per-channel calibration. Different EL products reach full brightness at
  // different duty, so this scales the gamma output by scalePct/100 (0..100).
  // Lets several inverter types be matched to each other.
  void setScale(uint8_t scalePct);
  uint8_t scale() const { return scalePct_; }

  // Last perceptual level written (for state reporting).
  uint8_t level() const { return level_; }

private:
  uint8_t  pin_      = 0;
  uint8_t  level_    = 0;
  uint8_t  scalePct_ = 100;
  bool     attached_ = false;
};
