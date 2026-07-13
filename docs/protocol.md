# EGBLE BLE Protocol

The controller exposes one GATT service with three characteristics. v1 uses
compact JSON on the wire: easy to debug from nRF Connect or a serial terminal,
and light enough for a 6-channel controller. If throughput ever matters the
same commands can move to a binary packet without touching the engine.

Patterns run on the device. BLE only moves commands and state, so the lights
keep running their last pattern if the phone disconnects.

## UUIDs

| Role    | UUID                                   | Properties      |
|---------|----------------------------------------|-----------------|
| Service | `6b1e0001-8f2a-4c3d-9a1b-2c3d4e5f6071` | -               |
| Command | `6b1e0002-8f2a-4c3d-9a1b-2c3d4e5f6071` | write, write-nr |
| State   | `6b1e0003-8f2a-4c3d-9a1b-2c3d4e5f6071` | read, notify    |
| Scene   | `6b1e0004-8f2a-4c3d-9a1b-2c3d4e5f6071` | read, write     |

These are mirrored in `firmware/egble-controller/BleService.h` and
`app/src/ble/uuids.ts`. Keep all three in sync.

## Command characteristic (write)

Write one JSON object per command. All timing is in milliseconds. `bri` is a
perceptual level 0 to 255 (the gamma table expands it to PWM duty on-device).

### Set a pattern

Target one of: a single channel (`ch`), a group (`grp`), or everything
(`all: true`). Only the fields relevant to the pattern type are needed; the
rest keep their defaults.

```json
{ "cmd": "pattern", "ch": 0, "type": "FADE_PULSE",
  "bri": 255, "fadeInMs": 800, "holdMs": 200, "fadeOutMs": 1000, "gapMs": 300 }
```

```json
{ "cmd": "pattern", "all": true, "type": "SOLID", "bri": 180 }
```

```json
{ "cmd": "pattern", "grp": 1, "type": "SEQUENCE", "stepMs": 220, "overlapMs": 90 }
```

Pattern types and the fields they use:

| type          | fields used                                  |
|---------------|----------------------------------------------|
| `OFF`         | (none)                                        |
| `SOLID`       | `bri`                                         |
| `BLINK`       | `bri`, `onMs`, `offMs`                         |
| `FADE_PULSE`  | `bri`, `fadeInMs`, `holdMs`, `fadeOutMs`, `gapMs` |
| `SOS`         | `bri`, `onMs` (Morse unit)                     |
| `TURN_SIGNAL` | `bri`, `onMs`, `offMs`                          |
| `SEQUENCE`    | `bri`, `stepMs`, `overlapMs` (per group)        |
| `FLAME`       | `bri`, `onMs` (flicker speed, smaller is livelier) |

`SEQUENCE` chases across all enabled channels that share the same group and are
set to `SEQUENCE`, in ascending channel order.

### Channel management

```json
{ "cmd": "enable", "ch": 0, "on": true }
{ "cmd": "group",  "ch": 0, "gid": 1 }
{ "cmd": "scale",  "ch": 0, "pct": 80 }
```

`scale` is per-channel calibration (0 to 100 percent). It scales the gamma
output so different EL products can be matched to each other.

### Live triggers

```json
{ "cmd": "trigger", "action": "sos" }
```

`action` is one of `left`, `right`, `sos`, `stop`. These apply a built-in
pattern to all channels for momentary actions.

### Request state

```json
{ "cmd": "get" }
```

Forces a state notification.

## State characteristic (read / notify)

Read the current per-channel state, or subscribe for notifications. The
firmware also pushes a throttled live update (about every 400 ms while
connected) so the app can show real channel levels. The app should render from
these notifications rather than assuming its writes succeeded, so the UI stays
truthful even if a command is dropped.

```json
{
  "v": "0.1.0",
  "ch": [
    { "e": 1, "g": 0, "p": "FADE_PULSE", "bri": 255, "sc": 100, "lvl": 123 },
    { "e": 1, "g": 0, "p": "SOLID",      "bri": 180, "sc": 100, "lvl": 180 }
  ]
}
```

| field | meaning                                  |
|-------|------------------------------------------|
| `v`   | firmware version                         |
| `e`   | enabled (1/0)                            |
| `g`   | group id                                 |
| `p`   | pattern type name                        |
| `bri` | pattern brightness cap (0 to 255)        |
| `sc`  | per-channel calibration scale (0 to 100) |
| `lvl` | current perceptual level right now       |

## Scene characteristic (read / write)

Write scene actions here. Reading returns the scene list (built-ins plus saved
NVS slots).

```json
{ "cmd": "scene", "action": "save",   "slot": 0, "name": "My Scene" }
{ "cmd": "scene", "action": "load",   "slot": 0 }
{ "cmd": "scene", "action": "delete", "slot": 0 }
{ "cmd": "scene", "action": "recall", "name": "Bike Vest" }
```

`save`/`load`/`delete` use writable slots 0 to 7, stored in NVS so they survive
a reboot. `recall` applies a built-in scene by name. Built-ins that ship with
the firmware: `Bike Vest`, `Retail Sequence`, `SOS`, `All On`, `All Off`.

Reading the scene characteristic returns:

```json
{
  "builtin": ["Bike Vest", "Retail Sequence", "SOS", "All On", "All Off"],
  "slots": [
    { "slot": 0, "name": "My Scene" },
    { "slot": 1, "name": null }
  ]
}
```
