#include "Pattern.h"
#include <string.h>
#include <strings.h>

static const char* const NAMES[PAT_COUNT] = {
  "OFF", "SOLID", "BLINK", "FADE_PULSE", "SOS", "TURN_SIGNAL", "SEQUENCE", "FLAME",
};

const char* patternName(PatternType t) {
  if (t < PAT_COUNT) return NAMES[t];
  return "UNKNOWN";
}

PatternType patternFromName(const char* name) {
  if (!name) return PAT_COUNT;
  for (uint8_t i = 0; i < PAT_COUNT; i++) {
    if (strcasecmp(name, NAMES[i]) == 0) return (PatternType)i;
  }
  return PAT_COUNT;
}
