# Ware - App Refinement Plan

Date: 2026-09-09. Base app: EGBLE 6-channel EL controller (Expo/React Native + ESP32-C3 firmware).
Target product: the sealed wearable EL inverter (Sch A: up to 3 HV zones, BLE, swap battery, amplitude dimming via boost Vset).

This is a planning document. Nothing here is implemented yet; it is the "keep / cut / change" map to react to.

## 1. Reality check: 6 channels becomes 1 to 3 zones

- The current app + firmware target a 6-channel low-side PWM board (ESP32-C3-Zero, MOSFET gates switching 5 V inverter grounds, gamma LEDC PWM).
- The wearable inverter is different hardware: up to 3 HV EL zones, ESP32-C3 with BLE, brightness set by the boost rail (Vset amplitude), patterns by gate timing.
- The app's control model still fits (bri 0..255, the same pattern types, scenes, triggers). What changes: "6 channels" should read as "zones" and cap at the product zone count (<= 3). The onboarding channel-count stepper is currently collected but never used, so it is either wired to the real zone count or dropped.

## 2. The two modes (Justin's concept)

### WEAR mode - worn, minimal, glanceable, hard to fat-finger
Surface kept:
- On/off orb
- Master brightness
- Preset picker (Steady / Flame / Strobe / Fade) + speed
- Safety triggers (SOS / Left / Right / Stop)
- Battery level + low-battery warning  (NEW, must add)
- Connection status only, with auto-reconnect (no manual scan UI)

Hidden in Wear: per-zone pattern editor, scene save/naming, calibration, demo toggle, grouping, onboarding.

### STORE mode - retail / demo / trade show, full showcase
Everything, plus:
- The JS demo controller (runs with no hardware - ideal on a show floor)
- All pattern types + all parameters, multi-zone editor, SEQUENCE
- Scene slots (save / name / recall)
- An attract loop (auto-cycle presets) [nice-to-have]

Toggle lives in Settings, persisted. Later: gate Store mode behind a long-press or PIN so a wearer cannot wander into it.

## 3. Feature-by-feature verdict

HOME (orb, on/off, master brightness, 4 presets, speed)
- KEEP. This screen is essentially Wear mode already. Strongest part of the app.

CHANNELS tab (per-channel cards, pattern chips, param sliders, group chips)
- KEEP for Store / advanced. Per-zone pattern + parameter control is a real power feature.
- CHANGE: cap the count at the product zone count (<= 3), relabel "channel" -> "zone".
- SIMPLIFY or CUT: group assignment (limited value at 3 zones).
- CUT from Wear mode entirely.

SCENES tab (live triggers, built-in recall, save/load/delete slots)
- Live triggers (SOS/Left/Right/Stop): KEEP and PROMOTE into Wear mode. Safety is core wearable value (bike vest).
- Built-in scene recall: KEEP.
- Save / name / delete slots: KEEP in Store/advanced; CUT from Wear.

DEVICE / SETTINGS (scan/connect, demo toggle, calibration, about)
- Scan/connect: KEEP, but in Wear mode auto-reconnect to the last device and hide the manual scan list.
- Demo toggle: KEEP - it is the engine of Store mode.
- Per-channel brightness calibration: MOVE to a setup/advanced area (a manufacturing trim, not a wearer control); CUT from Wear.
- About: KEEP.

ONBOARDING (5 steps)
- KEEP but trim: drop or rework the channel-count stepper (dead pref today); keep the "I have a controller" vs "Explore in Demo Mode" split - Demo is the Store-mode showcase entry.

## 4. Gaps to ADD for a wearable (not in the app today)

1. Battery status + low-battery alert for the swap battery. Highest priority - a wearable that cannot show its battery is a problem. Needs a firmware state field; can stub in the demo controller now.
   STATUS 2026-09-09: DONE in the app. Battery pill on Home (white/orange/red tiers) + LowBatteryBanner under 15 percent; simulated in Demo Mode (drains and wraps). Data path: parseState reads optional `bat:{p,ch}`; store `battery` field; graceful no-op when absent. Firmware still needs to add a VBAT divider + emit `bat` in the state JSON (protocol note below).
   Firmware TODO: report `"bat":{"p":<0-100>,"ch":<0|1>}` in the state characteristic; app already parses it.
2. Runtime / power modes - the "2 hours bright vs longer at reduced brightness vs blink to extend" idea. A battery-saver toggle.
3. Power-source indicator - when the USB-C pigtail / powerbank is the source, runtime differs; show it.
4. Optional: per-garment profiles (remember settings per outfit).

## 5. Dead ends / loose threads to clean

- `channelCount` pref is collected in onboarding but never renders anything.
- `setGroupPattern` store action + protocol exist, but no screen calls it.
- Demo built-ins list differs from the firmware built-ins ("Fade 6s", "All On" are demo-only); reconcile.
- Rename status: UI copy is "Ware"; app.json / package.json / bundle id / persist key are still "egble". Full rename needs an app-store identity decision + a persist-key migration. The BLE device name and repo intentionally stay EGBLE until a firmware reflash (documented in brand.ts). Recommendation: keep device/repo EGBLE for now, finish the store-identity rename when publishing.

## 6. Suggested first build steps (on your go)

1. Add a Mode toggle (Wear / Store) in Settings + a simplified Wear layout that hides the advanced tabs.
2. Add a battery indicator (firmware state field; stub in demo).
3. Cap zones to the product count and relabel channel -> zone.
4. Trim onboarding (drop the unused stepper).

Ordering rationale: 1 and 2 give the biggest product-shaping wins; 3 and 4 are cleanup that follows the zone-count decision.
