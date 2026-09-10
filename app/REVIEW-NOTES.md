# Ware - App Review resubmission kit

Covers the two rejection items from the 2026-09-01 review (Guideline 2.1 and Guideline 2.3.8).

## 2.3.8 Accurate Metadata (name mismatch) - FIXED in code

Apple saw "EGBLE" on the device while the store listing said "Ware by Ellumiglow".
The build manifest (`app/app.json`) now sets `expo.name` to **Ware**, so the next
build shows "Ware" on the Home screen and springboard. No action left here beyond
rebuilding and resubmitting.

Optional: in App Store Connect, consider setting the marketplace name to just
**Ware** (or keep "Ware by Ellumiglow"). Either is fine now that the device name is
"Ware" - they only need to be similar, not identical.

## 2.1 App Completeness (demo video) - needs a video you film

Apple could not exercise the app because it needs Bluetooth hardware. Two things fix it:

### A) Paste this into App Store Connect > App Review Information > Notes

    Ware controls Ellumiglow wearable EL light controllers over Bluetooth Low Energy.

    No account or login is required to use the app.

    To review the full app WITHOUT hardware, enable the built-in simulator:
      1. Open the app and complete the short walkthrough (or tap Skip).
      2. Go to the Device tab (bottom right).
      3. Turn on "Demo mode > Simulated controller".
    The app is now driven by an in-app simulated controller. Every screen works:
    the Home orb on/off and brightness, Activities (Run / Dog walk / Bike / Night),
    Power modes, Safety triggers (SOS / turn signals), the Channels pattern editor,
    and Scenes. A simulated battery indicator drains through its white/orange/red
    states so the low-battery behavior is visible.

    A demo video showing the app pairing with and controlling physical hardware on
    an iPhone is linked in the App Review Information "Demo Video" / notes field.

(Leave the demo-account username/password fields blank, or note "No login required".)

### B) Film a demo video (real iPhone + a real controller)

Apple explicitly wants: the current app running on a physical Apple device (not a
simulator), the initial pairing, and the full workflow with the hardware. Film in
one continuous take if you can. Suggested shot list (about 60-90 seconds):

  1. Show the iPhone home screen with the Ware icon, tap to open. (Proves it is a
     real device and the app is named "Ware".)
  2. Power on the EL controller / wearable so it is advertising.
  3. In the app: Device tab > "Scan for controllers" > the controller appears in the
     list > tap Connect. Hold on the "Connected" banner for a beat. (This is the
     initial pairing Apple asked for.)
  4. Home tab: tap the orb ON, drag Brightness up and down - show the physical lights
     respond in the same frame as the phone.
  5. Tap an Activity (e.g. Night) - show the light change pattern on the hardware.
  6. Tap a Safety trigger (SOS) - show the hardware blink the SOS pattern.
  7. Optional: switch Power mode to Endurance and show the light dim.
  8. Optional: Scenes tab > recall a built-in scene.

Keep BOTH the phone screen and the lit hardware visible together in the frame so the
reviewer can see the app driving the physical device. Upload the video (unlisted
YouTube / Vimeo / a direct link) and put the URL in App Review Information before you
tap "Resubmit to App Review", then reply to Apple's message with the link.
