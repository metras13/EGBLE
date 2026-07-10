# EGBLE Hardware Design

6-channel EL inverter dimmer/controller on ESP32-C3-Zero.

## Safety constraints (do not violate)

1. The ESP32 does NOT power the inverters. GPIO drives MOSFET gates only.
   Inverter 5V power comes from a separate 5V supply that shares a common
   ground with the ESP32. Never route six inverters worth of current through
   the C3-Zero board.
2. Low-side switching. Each MOSFET switches the ground return of one inverter's
   5V feed. Source to system ground, drain to inverter ground pin, gate to
   ESP32 GPIO through a gate resistor, with a pulldown gate to ground.
3. Dimming is PWM on the power feed, confirmed working on the target inverters.
   Hardware PWM (LEDC), 10-bit resolution, 7 kHz (inside the 5 to 10 kHz band).
4. Common ground between the 5V supply, all MOSFET sources and the ESP32 ground
   is non-negotiable for the switching to work.

## Per-channel circuit (repeat x6)

```
   5V supply (+) ---------------------------> inverter V+  (one inverter)
                                              inverter V-  --+
                                                             |
                                                          [DRAIN]
   ESP32 GPIO --[ 100 ohm ]--+------------[GATE]  N-ch MOSFET (AO3400 class)
                             |                  [SOURCE]
                          [ 10k ]                   |
                             |                      |
   system ground -----------+----------------------+---------> 5V supply (-)
```

- MOSFET: logic-level N-channel, AO3400 class or equivalent. Vgs(th) low enough
  for full enhancement at a 3.3V gate, low Rds(on), continuous drain current
  rating comfortably above a single inverter's draw.
- Gate resistor: about 100 ohm. Keeps switching crisp up to 10 kHz without
  excessive ringing.
- Gate pulldown: 10k gate to ground. Holds the channel OFF during ESP32 boot,
  before the GPIO is configured. This matters because a floating gate can let
  the channel switch on unpredictably at power-up.
- The MOSFET body diode handles inductive kick. If bench testing shows
  switching spikes, add a small snubber or flyback diode across the inverter
  feed.

## Power path

- Dedicated 5V supply sized for worst case: (per-inverter current) x 6, plus
  margin. MEASURE one inverter's draw under representative EL load before
  choosing the supply (see BOM below, the value is left blank on purpose).
- Common ground tying the 5V supply, all MOSFET sources and ESP32 ground.
- Power the ESP32 from its own USB-C or a regulated 5V tap. Keep its supply
  clean and separate from the noisy inverter rail where possible.

## GPIO assignment (ESP32-C3)

The C3 exposes GPIO 0 through 21, but several are unusable or risky:

- GPIO 11 to 17 are wired to the internal SPI flash. Never use them.
- GPIO 2, 8, 9 are strapping pins. Holding them in the wrong state at boot
  changes boot behavior, so they are avoided as outputs driving gates.
- GPIO 18, 19 are the native USB D-/D+ pair used for the serial console and
  flashing. Avoided.

All of GPIO 0 to 10 support LEDC PWM output. The six channels use safe,
non-strapping, non-USB pins:

| Channel | GPIO | Notes                                   |
|---------|------|-----------------------------------------|
| 0       | 3    | LEDC PWM                                |
| 1       | 4    | LEDC PWM                                |
| 2       | 5    | LEDC PWM                                |
| 3       | 6    | LEDC PWM                                |
| 4       | 7    | LEDC PWM                                |
| 5       | 10   | LEDC PWM                                |
| trigger | 1    | Optional physical trigger input, active low, internal pullup |

GPIO 0, 20, 21 are left free for future use. This table is mirrored in
`firmware/egble-controller/config.h`; keep the two in sync.

### Board compatibility

Any ESP32-C3 board with native USB works. Verified pin-compatible with the
Waveshare ESP32-C3-Zero and the Teyleten / generic ESP32-C3 SuperMini. All six
PWM pins (3, 4, 5, 6, 7, 10) and the trigger pin (1) are broken out on both.
The SuperMini labels its castellated pads by GPIO number, so the silkscreen
matches this table directly. On the SuperMini, GPIO8 drives the onboard LED and
GPIO9 is the BOOT button; both are already avoided here, so no change is needed.
Some SuperMini clones use a weaker PCB antenna, which can shorten BLE range but
does not affect a bench test.

## Bill of materials

Fill in the measured single-inverter current before ordering the supply.

| Qty | Part                        | Spec                                  |
|-----|-----------------------------|---------------------------------------|
| 1   | ESP32-C3 board              | C3-Zero or C3 SuperMini, USB-C        |
| 6   | N-channel MOSFET            | AO3400 class, logic-level             |
| 6   | Gate resistor               | 100 ohm, 1/8 W                        |
| 6   | Gate pulldown resistor      | 10k, 1/8 W                            |
| 1   | 5V DC supply                | rated for measured_current x 6 + 20%  |
| 6   | EL inverter                 | target product, 5V input              |
| 0-6 | Snubber/flyback diode       | only if bench testing shows spikes    |
| 1   | Protoboard / perfboard      | v1 build target                       |

Measured single-inverter current at 5V under representative EL load:
`__________ mA` (fill in during Phase 1).

## Build target

v1 is a stacked protoboard or hand-wired build, NOT a fabricated PCB. Prove the
circuit first. A PCB comes only after six channels run cleanly, per the build
sequence in the top-level README.
