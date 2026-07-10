# EGBLE App

React Native (Expo) app that controls the EGBLE 6-channel EL inverter
controller over BLE. It reuses the MOOD app's architecture: a persisted Zustand
store, a provider-style abstraction over the radio, Expo Router file-based
navigation, and the MOOD design tokens.

## Requirements

BLE needs native modules, so this runs in a development build, not Expo Go
(same as MOOD).

```bash
npm install
npx expo prebuild            # generates native projects
npx expo run:ios             # or run:android, on a real device
```

Bluetooth does not work in the iOS simulator; use a physical device.

## Structure

```
app/
  _layout.tsx            root stack, wires the BLE manager into the store
  (tabs)/index.tsx       channel dashboard + per-channel pattern editor
  (tabs)/scenes.tsx      live triggers, built-in recall, saved slots
  (tabs)/settings.tsx    scan/connect + brightness calibration
src/
  ble/
    uuids.ts             GATT UUIDs (mirror the firmware)
    protocol.ts          command builders + state parsing (pure, testable)
    bleManager.ts        react-native-ble-plx connection layer
    base64.ts            payload codec
  store/appStore.ts      persisted Zustand store
  constants/
    patterns.ts          pattern model (mirrors firmware Pattern.h)
    colors.ts            design tokens
  components/            ConnectionBanner, shared UI pieces
```

## Design notes

- The UI renders from firmware state notifications, not optimistic local
  writes, so the display stays truthful even if a command is dropped.
- If BLE drops, the banner shows "reconnecting" and the controller keeps
  running its last pattern. The app never implies the lights went off.
- `src/ble/protocol.ts` is dependency-free on purpose so the wire format can be
  unit tested without a device.

See `../docs/protocol.md` for the command schema and `../README.md` for the
overall build sequence.
