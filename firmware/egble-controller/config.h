// EGBLE Controller - build configuration and pin map
//
// Target: ESP32-C3-Zero (Waveshare / clone), single core RISC-V, native USB CDC.
//
// GPIO selection rationale (see docs/hardware.md for the full table):
//   ESP32-C3 usable GPIOs are 0-10 and 18-21. GPIO11-17 are wired to the
//   internal SPI flash and must never be used. Strapping pins 2, 8 and 9
//   change boot behavior when held, so they are avoided. GPIO18/19 are the
//   native USB D-/D+ pair used for the serial console and flashing, so they
//   are avoided as well.
//
// Safe pins chosen for the six PWM channels: 3, 4, 5, 6, 7, 10.
// One spare GPIO (1) is reserved for an optional physical trigger input.
// GPIO0, 20 and 21 are left free for future use.

#pragma once

#include <stdint.h>

// Number of dimmer channels.
static const uint8_t NUM_CHANNELS = 6;

// PWM output pins, indexed by channel number 0..5.
static const uint8_t CHANNEL_PINS[NUM_CHANNELS] = { 3, 4, 5, 6, 7, 10 };

// Optional physical trigger input (active low, internal pullup).
// Set to -1 to disable.
static const int8_t TRIGGER_PIN = 1;

// LEDC PWM configuration.
//   10-bit resolution gives 1024 duty steps (0..1023).
//   7 kHz sits in the confirmed 5-10 kHz window and is above audible range.
static const uint8_t  PWM_RESOLUTION_BITS = 10;
static const uint32_t PWM_MAX_DUTY        = (1u << PWM_RESOLUTION_BITS) - 1u;  // 1023
static const uint32_t PWM_FREQ_HZ         = 7000;

// Perceptual brightness range used across the whole system. Callers work in
// perceptual levels 0..255; the gamma table expands them to PWM duty.
static const uint16_t BRIGHTNESS_MAX = 255;

// Pattern engine tick period. Fades and blinks are recomputed this often.
// 10 ms (100 Hz) is smooth for the eye and cheap for the C3.
static const uint32_t TICK_INTERVAL_MS = 10;

// NVS namespace used for stored scenes.
static const char NVS_NAMESPACE[] = "egble";

// Firmware version string reported over BLE and serial.
static const char FW_VERSION[] = "0.1.0";
