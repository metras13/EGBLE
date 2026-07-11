# EGBLE Firmware

Arduino-ESP32 firmware for the 6-channel EL inverter controller.

## Toolchain

- Board: ESP32-C3-Zero. Select "ESP32C3 Dev Module" in the Arduino IDE (or the
  `esp32:esp32:esp32c3` FQBN for arduino-cli).
- Core: esp32 by Espressif, version 3.x. The channel driver uses the 3.x LEDC
  API (`ledcAttach` / `ledcWrite`). On a 2.x core it would need the older
  `ledcSetup` / `ledcAttachPin` calls.
- Enable "USB CDC On Boot" so `Serial` runs over the native USB-C port.

## Libraries

Install through the Arduino Library Manager:

| Library         | Tested version |
|-----------------|----------------|
| NimBLE-Arduino  | 2.x            |
| ArduinoJson     | 7.x            |

NimBLE is used instead of the stock BLE stack because it is far smaller, which
matters on the C3. NimBLE-Arduino 2.x is required: it is the line that matches
esp32 core 3.x. Pairing an older 1.4.x NimBLE with a 3.x core links but crashes
at boot with a controller/host version mismatch (a "fadebead VERSION" mismatch
followed by an instruction access fault panic loop).

## Build and flash

Arduino IDE: open `firmware/egble-controller/egble-controller.ino`, pick the
board and port, upload.

arduino-cli:

```bash
arduino-cli compile --fqbn esp32:esp32:esp32c3 firmware/egble-controller
arduino-cli upload  --fqbn esp32:esp32:esp32c3 -p /dev/ttyACM0 firmware/egble-controller
```

## Serial console (bench testing)

Open the serial monitor at 115200 baud. This is the temporary interface for
Phases 1 to 3, before BLE or the app matter. Type `help` for the list:

```
help                 this list
state                dump per-channel state
scenes               list built-in scenes and saved slots
recall <name>        apply a built-in scene by name
level <ch> <0-255>   set a channel to a solid brightness
sweep <ch>           gamma fade sweep to eyeball smoothness
raw <ch> <0-1023>    write raw PWM duty, gamma bypassed
off                  all channels off
{ ... }              raw JSON command (see protocol.md)
```

Suggested Phase 1 bench sequence on a single channel:

1. `raw 0 512` and confirm the inverter lights at roughly half. Sweep the raw
   value to check for flicker or audible whine, and adjust `PWM_FREQ_HZ` in
   `config.h` if needed (stay within 5 to 10 kHz).
2. `sweep 0` and watch the fade. It should look smooth and even, not snap
   bright early. If it does snap, retune gamma: run
   `python3 firmware/tools/gen_gamma.py 2.4` (or another value) and paste the
   output over `GAMMA_LUT` in `gamma.h`.
3. Measure the inverter current draw at full brightness and record it in
   `docs/hardware.md`.

## Module map

| File                | Responsibility                                        |
|---------------------|-------------------------------------------------------|
| `config.h`          | pin map, PWM settings, tick rate, versions            |
| `gamma.h`           | gamma 2.2 lookup table (regenerate with the tool)     |
| `Channel.*`         | one LEDC PWM output plus gamma and calibration scale  |
| `Pattern.*`         | pattern type enum, config struct, name lookup         |
| `PatternEngine.*`   | per-channel non-blocking state machines               |
| `Scenes.*`          | scene capture/apply, NVS storage, built-in scenes     |
| `Protocol.*`        | JSON command parsing and state serialization          |
| `BleService.*`      | NimBLE GATT service                                   |
| `SerialConsole.*`   | USB bench console                                     |
| `egble-controller.ino` | setup/loop wiring and physical trigger input       |

## Regenerating the gamma table

```bash
python3 firmware/tools/gen_gamma.py 2.2
```

Paste the printed array over `GAMMA_LUT` in `gamma.h`. Higher gamma dims the low
end more aggressively; tune it to the specific inverter/EL product.
