# Ware app roadmap

## v1.1 - Vibe tab (this branch: claude/vibe-tab)

Replaces the old "Scenes" tab, which duplicated Home's safety triggers and was
mostly empty scaffolding, with **Vibe**: a one-tap gallery of looks.

- `src/constants/vibes.ts` - the Vibe library. Each Vibe is an icon + label +
  blurb + a `build(bri, speed)` that returns a PatternConfig. Add a Vibe here
  and it appears in the gallery automatically. All map onto existing firmware
  pattern types, so no firmware change is needed.
- `app/(tabs)/scenes.tsx` - the gallery UI (route name kept as `scenes` so
  deep links do not break; tab title is "Vibe"). Tap a card to apply, tune
  Speed, then save into one of the 8 controller slots. Saved and on-controller
  scenes list below.
- Safety triggers were removed from this tab (they live on Home).

Vibes shipped: Steady, Breathe, Heartbeat, Campfire, Party, Cadence, Beacon,
Music (beta), SOS.

### Follow-ups for v1.1 polish
- **Music mode: real mic reactivity.** Today it is a lively self-driving pulse
  (beta). Wire the phone microphone so it reacts to actual sound. Needs an audio
  dependency (`expo-av` metering, or `expo-audio`), a mic permission string, and
  a metering loop that maps level -> brightness. Kept out of the first cut to
  avoid adding a dependency mid app-review.
- **Animated card previews.** Small looping preview of each pattern on the card
  face so the look is obvious before applying.
- **Favorites row** pinned above the gallery.
- **Link a Vibe to each Activity** so choosing Bike on Home also sets its look.

## v2-v5 - Find a Friend (proximity glow)

AirTag-style "find your people in a crowd." Two or more Ware wearers opt in;
as they get closer the light pulses faster and brighter, so you can home in on
each other at a festival, night ride, or event.

- **Ranging:** BLE RSSI is the cheap first pass (coarse, works on the ESP32
  already), Apple Nearby Interaction / UWB is the accurate version but needs UWB
  hardware. Start RSSI-only.
- **Pairing:** a short-lived "find code" or QR so only invited friends range each
  other; no accounts, matches the app's no-login privacy stance.
- **Mapping:** distance bucket -> pulse rate/brightness (far = slow dim, near =
  fast bright), reusing the pattern engine.
- **Privacy:** opt-in per session, auto-expire, nothing leaves the phone.
- Likely needs a companion firmware capability (advertise + scan a rotating
  find-token) and a new Home affordance ("Find a friend").
