#include "Channel.h"
#include "config.h"
#include "gamma.h"
#include <Arduino.h>

void Channel::begin(uint8_t pin) {
  pin_ = pin;
  // Arduino-ESP32 core 3.x LEDC API: attach the pin at a frequency and
  // resolution and the core allocates a hardware channel automatically.
  ledcAttach(pin_, PWM_FREQ_HZ, PWM_RESOLUTION_BITS);
  attached_ = true;
  ledcWrite(pin_, 0);
}

void Channel::setBrightness(uint8_t level) {
  level_ = level;
  if (!attached_) return;
  uint32_t duty = GAMMA_LUT[level];
  // Apply per-channel calibration scale.
  duty = (duty * scalePct_) / 100u;
  if (duty > PWM_MAX_DUTY) duty = PWM_MAX_DUTY;
  // Compress any lit output into [OUTPUT_FLOOR_DUTY, PWM_MAX_DUTY] so the dimmest
  // visible drive clears the inverter's oscillator start threshold and fades
  // ramp smoothly rather than popping on. Level 0 stays fully off.
  if (level > 0 && OUTPUT_FLOOR_DUTY > 0) {
    duty = OUTPUT_FLOOR_DUTY + duty * (PWM_MAX_DUTY - OUTPUT_FLOOR_DUTY) / PWM_MAX_DUTY;
  }
  ledcWrite(pin_, duty);
}

void Channel::setRawDuty(uint16_t duty) {
  if (!attached_) return;
  if (duty > PWM_MAX_DUTY) duty = PWM_MAX_DUTY;
  ledcWrite(pin_, duty);
}

void Channel::setScale(uint8_t scalePct) {
  if (scalePct > 100) scalePct = 100;
  scalePct_ = scalePct;
  // Reapply at the current level so the change is visible immediately.
  setBrightness(level_);
}
