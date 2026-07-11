# EGBLE

6-channel EL inverter dimmer/controller. Working name; the title will change
later.

- Target hardware: ESP32-C3-Zero (Waveshare or clone)
- Firmware: Arduino-ESP32, gamma-corrected LEDC PWM, on-device pattern engine
- App: React Native over BLE, reusing the MOOD app's architecture patterns

The ESP32 drives six MOSFET gates; the inverters are powered by a separate 5V
supply on a common ground. The ESP32 never carries inverter current. See
`docs/hardware.md`.

First bench test: the firmware boots into a six second breathing fade (three
seconds up, three seconds down) with no phone required. Start at
`docs/bench-bringup.md`.

## Layout

```
docs/
  hardware.md    circuit, power path, pin map, BOM
  protocol.md    BLE GATT service and JSON command schema
  firmware.md    build/flash and the bench serial console
firmware/
  egble-controller/   Arduino-ESP32 sketch and modules
  tools/gen_gamma.py  regenerate the gamma lookup table
app/               React Native (Expo) app
```

## Design constraints (carried from the work plan)

1. The ESP32 does not power the inverters. GPIO drives MOSFET gates only.
2. Low-side switching: each MOSFET switches one inverter's 5V ground return.
3. Dimming is hardware PWM (LEDC), 10-bit, 7 kHz.
4. Gamma correction is mandatory. Every fade ramps through the gamma table,
   never linear duty.
5. Patterns run on the ESP32, not the phone. The phone sends a command; the
   device executes and keeps running if the phone disconnects.
6. No em dashes in code comments, UI copy, or docs.

## Build sequence

The firmware and app are structured so each phase builds on a proven one.

- Phase 1: single-channel bench proof. LEDC PWM + gamma, driven by the serial
  console. Confirm a smooth fade on a real inverter, lock the PWM frequency,
  tune gamma, measure inverter current. (Firmware ready; needs bench work.)
- Phase 2: pattern engine, single channel. All pattern types over serial.
  (Firmware ready.)
- Phase 3: six channels. Grouping and SEQUENCE. (Firmware ready; needs the
  6-channel protoboard.)
- Phase 4: BLE layer. GATT command/state/scene characteristics, NVS scenes.
  Drive from nRF Connect before the app. (Firmware ready.)
- Phase 5: app. Adapt MOOD's structure, build the screens, wire to the GATT
  service. (App scaffold in `app/`.)
- Phase 6: hardening and PCB. Per-inverter calibration, EMI review, thermal
  check, then a real PCB.

## Status

Firmware implements Phases 1 to 4: gamma PWM driver, the full pattern engine
(OFF, SOLID, BLINK, FADE_PULSE, SOS, TURN_SIGNAL, SEQUENCE), channel enable and
grouping, NVS scenes with five built-ins, the BLE GATT service, and a bench
serial console. The app provides the Phase 5 structure: BLE client, store, and
the core screens. Both are ready to bring up against real hardware.
