# Morning bench bring-up

Goal for the first session: a single EL inverter fading on to off over six
seconds on the bench, driven by the ESP32-C3 dev board. Do it in two stages.
Stage 1 needs no phone and proves the hardware. Stage 2 brings up the app.

## Before you start

- ESP32-C3-Zero dev board, USB-C cable.
- One EL inverter, one logic-level N-channel MOSFET (AO3400 class), a 100 ohm
  gate resistor, a 10k gate-to-ground pulldown.
- Bench 5V supply for the inverter, sharing a common ground with the board.
- Wiring for one channel per `docs/hardware.md`: GPIO3 to the gate through the
  100 ohm resistor, 10k gate to ground, MOSFET source to ground, drain to the
  inverter ground return, inverter V+ to the bench 5V.

See `docs/wiring-single-channel.svg` for the full single-channel bench diagram.

Reminder: the board never carries inverter current. It only drives the gate.

## Stage 1: fade with no app (most reliable first test)

The firmware boots straight into the "Fade 6s" scene, so once flashed the wired
channel fades on to off over six seconds and repeats. No BLE, no app.

1. Install the Arduino toolchain (one time):
   - esp32 core 3.x (Boards Manager) and select "ESP32C3 Dev Module".
   - Libraries: NimBLE-Arduino 1.4.x and ArduinoJson 7.x (see docs/firmware.md).
   - Enable "USB CDC On Boot" so Serial runs over USB-C.
2. Open `firmware/egble-controller/egble-controller.ino`, pick the board and
   port, and upload. Or with arduino-cli:
   ```bash
   arduino-cli compile --fqbn esp32:esp32:esp32c3 firmware/egble-controller
   arduino-cli upload  --fqbn esp32:esp32:esp32c3 -p /dev/ttyACM0 firmware/egble-controller
   ```
   ESP32-C3 SuperMini note: if the port will not take an upload, force download
   mode by holding BOOT, tapping RESET, releasing RESET, then releasing BOOT,
   and upload again. Some units need this on every connect.
3. Power the bench 5V. Channel 0 (GPIO3) should snap to full and fade to off
   over six seconds, then repeat.

If it works, you have proven PWM, gamma, the MOSFET, and the inverter together.

### If the fade misbehaves

Open the serial monitor at 115200 baud and use the console (type `help`):

- No light at all: check wiring and the common ground first. Then try
  `raw 0 1023` (full duty, gamma bypassed). If that lights, the pattern path is
  fine; if not, it is hardware.
- Flicker or audible whine: sweep the raw value (`raw 0 200`, `raw 0 800`) and
  if needed lower or raise `PWM_FREQ_HZ` in `config.h` within 5 to 10 kHz.
- Fade looks like it snaps bright early rather than easing: retune gamma. Run
  `python3 firmware/tools/gen_gamma.py 2.4` and paste over `GAMMA_LUT` in
  `gamma.h`, reflash, and compare. `sweep 0` ramps once so you can eyeball it.
- Re-trigger the fade any time with the `fade` command.
- Measure the inverter current at full and record it in `docs/hardware.md`.

## Stage 2: same fade from the Expo app

The app talks to the board over BLE, so it needs a custom dev build (not Expo
Go), and the board from Stage 1 must be powered and advertising. BLE does not
work in the iOS simulator, so use a physical phone.

1. Install and generate the native project:
   ```bash
   cd app
   npm install
   npx expo prebuild
   ```
2. Put the app on a real device, either a local native build or an EAS dev
   build:
   ```bash
   npx expo run:android          # or run:ios, device plugged in
   # or, cloud build a development client:
   npx eas build --profile development --platform android
   ```
3. Open the app, go to the Device tab, Scan, and connect to
   "EGBLE-Controller".
4. Go to the Scenes tab. "Fade 6s" is the first built-in. Tap Recall and the
   board runs the same six second fade, now commanded over BLE.

The Channels tab shows live per-channel state from the board. The connection
banner shows "reconnecting" if BLE drops, and the board keeps fading on its own.

### Likely first-run snags

- react-native-ble-plx needs the dev client; it will not run in Expo Go.
- Android needs Bluetooth and location permissions granted at first launch;
  they are declared in `app.json`.
- If the scan finds nothing, confirm Stage 1 left the board powered and that
  the serial log printed `[ble] advertising as "EGBLE-Controller"`.
- NimBLE-Arduino major version matters. The firmware is written for 1.4.x. If
  the library manager installed 2.x, either pin 1.4.x or expect the BLE
  callback signatures to need updating.

## What to report back

- Did Stage 1 fade cleanly? Any flicker, whine, or gamma tuning needed?
- Measured single-inverter current at full brightness.
- Did Stage 2 connect and recall the fade?

Any of these tells me the next change to make.
