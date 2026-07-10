// EGBLE Controller - pattern definitions
//
// A pattern is DATA, not code. Every built-in effect is described by the same
// PatternConfig struct; the engine interprets it. Adding a new demo later is a
// config change (new type value plus a branch in the engine), never a rewrite
// of the channel plumbing.

#pragma once

#include <stdint.h>

enum PatternType : uint8_t {
  PAT_OFF        = 0,  // channel dark
  PAT_SOLID      = 1,  // steady at bri
  PAT_BLINK      = 2,  // onMs at bri, offMs dark, repeat
  PAT_FADE_PULSE = 3,  // fade in, hold, fade out, gap, repeat (gamma ramp)
  PAT_SOS        = 4,  // Morse SOS, unit = onMs
  PAT_TURN_SIGNAL= 5,  // fast blink for a triggered turn indicator
  PAT_SEQUENCE   = 6,  // group chase: members light in channel order
  PAT_COUNT
};

// All timing is in milliseconds. Unused fields for a given type are ignored.
// bri is a perceptual level 0..255 (the brightness cap for the pattern).
struct PatternConfig {
  PatternType type      = PAT_OFF;
  uint8_t     bri       = 255;   // brightness cap
  uint16_t    onMs      = 200;   // BLINK/SOS on time, SOS unit
  uint16_t    offMs     = 200;   // BLINK off time
  uint16_t    fadeInMs  = 600;   // FADE_PULSE ramp up
  uint16_t    holdMs    = 300;   // FADE_PULSE hold at cap
  uint16_t    fadeOutMs = 900;   // FADE_PULSE ramp down
  uint16_t    gapMs     = 400;   // FADE_PULSE dark gap before repeat
  uint16_t    stepMs    = 250;   // SEQUENCE per-member step time
  uint16_t    overlapMs = 0;     // SEQUENCE tail overlap between members
};

// Human-readable name for logs and the serial console.
const char* patternName(PatternType t);

// Parse a name (case-insensitive) into a type. Returns PAT_COUNT on no match.
PatternType patternFromName(const char* name);
