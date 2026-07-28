# Ware - App Store submission guide

What is prepared in the repo, what you still have to do by hand, and the review
risk to plan around before you submit.

## Prepared in this repo

- App name "Ware", version 1.0.0, iOS build number 1, bundle id
  `com.ellumiglow.egble`.
- App icon (`assets/icon.png`, 1024x1024), Android adaptive icon, and a dark
  splash screen wired through `app.json` and `expo-splash-screen`.
- Bluetooth usage strings and export-compliance flag
  (`ITSAppUsesNonExemptEncryption: false`) set in `app.json`.
- `eas.json` has a `production` build profile.

## You need (only you can do these)

1. An Apple Developer Program membership (you already ship apps, so this is set).
2. The EAS CLI, logged in: `npm install -g eas-cli && eas login`.
3. An App Store Connect app record for `com.ellumiglow.egble` (create it under
   your ellumiglow team; reuse the bundle id or register it if new).
4. Store metadata (below).
5. A privacy policy URL and a support URL (required fields).
6. Screenshots (below).

## Build and submit

```bash
cd app
npm install
eas build --platform ios --profile production
eas submit --platform ios --latest
```
`eas submit` will prompt for your Apple ID and the App Store Connect app; it can
auto-detect the app record. After it uploads, finish in App Store Connect:
attach the build, fill metadata, answer App Privacy, and submit for review.

## Store metadata to write

- Name: Ware
- Subtitle (30 chars): e.g. "Wearable light control"
- Description: what it does (BLE control of the EL inverter controller: on/off,
  brightness, Flame/Strobe/Fade presets, per-channel patterns, scenes).
- Keywords, primary category (Utilities), support URL, marketing URL (optional).
- Age rating questionnaire.

## Screenshots (required)

Apple needs screenshots for at least one iPhone size (currently 6.9 inch and
6.5 inch classes). Capture the Home (orb), Channels, and Scenes screens on a
device or simulator. Since the UI needs a connected controller to look alive, a
demo mode (see review risk) makes good screenshots much easier.

## App Privacy

The app collects no personal data and has no analytics or accounts. In the App
Privacy section, declare "Data Not Collected". Bluetooth is used only to control
the user's own device; the usage strings are already set. Expo prebuild
generates the iOS privacy manifest for required-reason APIs.

## Review risk to plan around (important)

Ware is a Bluetooth hardware companion app. App Review runs on a device that
cannot see your controller, so a reviewer cannot exercise the core function.
This is the most common rejection reason for companion apps (Guideline 2.1).
Two things reduce that risk a lot:

1. A demo / offline mode: a toggle that simulates a connected controller with
   fake channel state so every screen is usable and the reviewer can see it
   work. This also makes screenshots trivial. Strongly recommended before
   submitting.
2. Clear App Review notes: explain that it controls a specific BLE device, that
   the device is not required to review the UI if a demo mode is present, and
   attach a short screen-recording of it driving real hardware.

Also worth doing before v1 review, to avoid a "minimum functionality" (4.2)
flag: the onboarding walkthrough, so a first-time reviewer understands the app
without hardware in hand.

## Version bumps for future builds

Raise `version` and `ios.buildNumber` in `app.json` (or rely on `autoIncrement`
in the `production` profile for the build number) before each new build.
