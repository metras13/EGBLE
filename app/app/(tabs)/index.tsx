/**
 * Ware - Home
 *
 * The orb is the main control: tap to turn the light on or off, drag the
 * brightness slider to dim. Above it sit the wearer-facing controls: Activities
 * (one-tap modes tuned for a run, dog walk, bike, or night traffic), a Power
 * mode that trades brightness for runtime (and nudges you to Endurance when the
 * battery runs low), and Safety triggers (SOS and turn signals).
 *
 * In Wear mode the screen shows only those worn-use controls. In Store mode it
 * also exposes the raw pattern Presets and a Speed slider for a show floor.
 * State is read back from the controller's notifications so the orb reflects
 * reality.
 */

import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { useAppStore } from '../../src/store/appStore';
import { ConnectionBanner } from '../../src/components/ConnectionBanner';
import { BatteryIndicator, LowBatteryBanner } from '../../src/components/BatteryIndicator';
import { Colors, Radius, Spacing } from '../../src/constants/colors';
import { APP_NAME, APP_TAGLINE } from '../../src/constants/brand';
import { DEFAULT_PATTERN, PatternConfig, PatternType } from '../../src/constants/patterns';
import { batteryTier, TriggerAction } from '../../src/ble/protocol';
import {
  ACTIVITIES,
  ActivityKey,
  POWER_MODES,
  effectiveBrightness,
} from '../../src/constants/activities';

type Preset = 'steady' | 'flame' | 'strobe' | 'fade';

const PRESETS: { key: Preset; label: string; type: PatternType; color: string }[] = [
  { key: 'steady', label: 'Steady', type: 'SOLID', color: Colors.accent },
  { key: 'flame', label: 'Flame', type: 'FLAME', color: Colors.pattern.FLAME },
  { key: 'strobe', label: 'Strobe', type: 'BLINK', color: Colors.pattern.BLINK },
  { key: 'fade', label: 'Fade', type: 'FADE_PULSE', color: Colors.pattern.FADE_PULSE },
];

const SAFETY: { action: TriggerAction; label: string; color: string }[] = [
  { action: 'sos', label: 'SOS', color: Colors.pattern.SOS },
  { action: 'left', label: '◀ Left', color: Colors.pattern.TURN_SIGNAL },
  { action: 'right', label: 'Right ▶', color: Colors.pattern.TURN_SIGNAL },
  { action: 'stop', label: 'Off', color: Colors.muted },
];

// What the orb last turned on, so tapping it (or changing power/brightness)
// re-applies the same look at the new level.
type Source =
  | { kind: 'preset'; preset: Preset }
  | { kind: 'activity'; key: ActivityKey };

// Map a 0..100 speed slider to a preset's timing. Higher speed = livelier.
function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * (t / 100));
}

function buildPreset(preset: Preset, bri: number, speed: number): PatternConfig {
  switch (preset) {
    case 'flame':
      return { ...DEFAULT_PATTERN, type: 'FLAME', bri, onMs: lerp(180, 30, speed) };
    case 'strobe': {
      const r = lerp(300, 40, speed);
      return { ...DEFAULT_PATTERN, type: 'BLINK', bri, onMs: r, offMs: r };
    }
    case 'fade': {
      const d = lerp(4000, 500, speed);
      return { ...DEFAULT_PATTERN, type: 'FADE_PULSE', bri, fadeInMs: d, holdMs: 0, fadeOutMs: d, gapMs: 0 };
    }
    case 'steady':
    default:
      return { ...DEFAULT_PATTERN, type: 'SOLID', bri };
  }
}

export default function Home() {
  const channels = useAppStore((s) => s.channels);
  const status = useAppStore((s) => s.status);
  const battery = useAppStore((s) => s.battery);
  const brightness = useAppStore((s) => s.masterBrightness);
  const setBrightness = useAppStore((s) => s.setMasterBrightness);
  const setAllPattern = useAppStore((s) => s.setAllPattern);
  const trigger = useAppStore((s) => s.trigger);
  const wearMode = useAppStore((s) => s.wearMode);
  const powerMode = useAppStore((s) => s.powerMode);
  const setPowerMode = useAppStore((s) => s.setPowerMode);

  const [source, setSource] = useState<Source>({ kind: 'preset', preset: 'steady' });
  const [speed, setSpeed] = useState(50);

  const connected = status === 'connected' || status === 'reconnecting';
  const isOn = channels.length > 0 && channels.some((c) => c.pattern !== 'OFF');

  // Color the orb by whatever is active.
  const orbColor =
    source.kind === 'activity'
      ? ACTIVITIES.find((a) => a.key === source.key)!.color
      : PRESETS.find((p) => p.key === source.preset)!.color;

  // Build the pattern for the current source at a given brightness / speed.
  const buildFor = (src: Source, bri: number, spd: number): PatternConfig => {
    const eff = effectiveBrightness(bri, powerMode);
    if (src.kind === 'activity') return ACTIVITIES.find((a) => a.key === src.key)!.build(eff);
    return buildPreset(src.preset, eff, spd);
  };

  const applySource = (src: Source, bri = brightness, spd = speed) => {
    setSource(src);
    setAllPattern(buildFor(src, bri, spd));
  };

  const toggleOrb = () => {
    if (isOn) setAllPattern({ ...DEFAULT_PATTERN, type: 'OFF' });
    else applySource(source);
  };

  const onBrightness = (v: number) => {
    setBrightness(v);
    if (isOn) setAllPattern(buildFor(source, v, speed));
  };

  const onSpeed = (v: number) => {
    setSpeed(v);
    if (isOn && source.kind === 'preset' && source.preset !== 'steady') {
      setAllPattern(buildFor(source, brightness, v));
    }
  };

  const onPowerMode = (m: typeof powerMode) => {
    setPowerMode(m);
    if (isOn) setAllPattern(buildFor(source, brightness, speed));
  };

  const onSafety = (action: TriggerAction) => {
    trigger(action);
  };

  const briPct = Math.round((brightness / 255) * 100);
  const showSaverNudge =
    battery.present && !battery.charging && batteryTier(battery.pct) !== 'good' && powerMode !== 'endurance';
  const showPresets = !wearMode; // raw pattern editor + speed live in Store mode only

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.brand}>{APP_NAME}</Text>
            <Text style={styles.tagline}>{wearMode ? 'Wear mode' : APP_TAGLINE}</Text>
          </View>
          <BatteryIndicator />
        </View>
        <ConnectionBanner />
        <LowBatteryBanner />

        {/* Orb */}
        <View style={styles.orbWrap}>
          {isOn && (
            <>
              <View style={[styles.glow, styles.glowOuter, { backgroundColor: orbColor }]} />
              <View style={[styles.glow, styles.glowInner, { backgroundColor: orbColor }]} />
            </>
          )}
          <Pressable
            onPress={toggleOrb}
            disabled={!connected}
            style={[
              styles.orb,
              {
                borderColor: orbColor,
                backgroundColor: isOn ? orbColor : Colors.bg3,
                opacity: connected ? (isOn ? 0.35 + (briPct / 100) * 0.65 : 1) : 0.4,
              },
            ]}
          >
            <Text style={[styles.orbState, { color: isOn ? Colors.bg : orbColor }]}>
              {isOn ? 'ON' : 'OFF'}
            </Text>
            <Text style={[styles.orbSub, { color: isOn ? Colors.bg : Colors.muted }]}>
              {isOn ? `${briPct}%` : 'tap to turn on'}
            </Text>
          </Pressable>
        </View>

        {/* Brightness */}
        <View style={styles.sliderBlock}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Brightness</Text>
            <Text style={styles.sliderValue}>{briPct}%</Text>
          </View>
          <Slider
            minimumValue={0}
            maximumValue={255}
            step={1}
            value={brightness}
            onValueChange={onBrightness}
            minimumTrackTintColor={orbColor}
            maximumTrackTintColor={Colors.bg4}
            thumbTintColor={orbColor}
          />
        </View>

        {/* Activities */}
        <Text style={styles.section}>Activities</Text>
        <View style={styles.grid}>
          {ACTIVITIES.map((a) => {
            const on = source.kind === 'activity' && source.key === a.key;
            return (
              <Pressable
                key={a.key}
                onPress={() => applySource({ kind: 'activity', key: a.key })}
                disabled={!connected}
                style={[
                  styles.tile,
                  { borderColor: on ? a.color : Colors.border, backgroundColor: on ? a.color + '22' : Colors.bg2 },
                ]}
              >
                <Text style={styles.tileEmoji}>{a.emoji}</Text>
                <Text style={[styles.tileLabel, { color: on ? a.color : Colors.text }]}>{a.label}</Text>
                <Text style={styles.tileBlurb}>{a.blurb}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Power mode */}
        <Text style={styles.section}>Power</Text>
        <View style={styles.segment}>
          {POWER_MODES.map((m) => {
            const on = powerMode === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => onPowerMode(m.key)}
                style={[
                  styles.segItem,
                  { backgroundColor: on ? Colors.accent : Colors.bg2, borderColor: on ? Colors.accent : Colors.border },
                ]}
              >
                <Text style={[styles.segLabel, { color: on ? Colors.bg : Colors.text }]}>{m.label}</Text>
                <Text style={[styles.segBlurb, { color: on ? Colors.bg : Colors.muted }]}>{m.blurb}</Text>
              </Pressable>
            );
          })}
        </View>
        {showSaverNudge && (
          <Pressable style={styles.nudge} onPress={() => onPowerMode('endurance')}>
            <Text style={styles.nudgeText}>
              Battery at {battery.pct}% - tap to switch to Endurance and stretch runtime
            </Text>
          </Pressable>
        )}

        {/* Safety */}
        <Text style={styles.section}>Safety</Text>
        <View style={styles.safetyRow}>
          {SAFETY.map((s) => (
            <Pressable
              key={s.action}
              onPress={() => onSafety(s.action)}
              disabled={!connected}
              style={[styles.safetyBtn, { borderColor: s.color }]}
            >
              <Text style={[styles.safetyText, { color: s.color }]}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Presets + Speed (Store mode only) */}
        {showPresets && (
          <>
            <Text style={styles.section}>Presets</Text>
            <View style={styles.presetRow}>
              {PRESETS.map((p) => {
                const on = source.kind === 'preset' && source.preset === p.key;
                return (
                  <Pressable
                    key={p.key}
                    onPress={() => applySource({ kind: 'preset', preset: p.key })}
                    disabled={!connected}
                    style={[
                      styles.preset,
                      { borderColor: on ? p.color : Colors.border, backgroundColor: on ? p.color + '22' : Colors.bg2 },
                    ]}
                  >
                    <Text style={[styles.presetText, { color: on ? p.color : Colors.text }]}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {source.kind === 'preset' && source.preset !== 'steady' && (
              <View style={styles.sliderBlock}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Speed</Text>
                  <Text style={styles.sliderValue}>{speed}%</Text>
                </View>
                <Slider
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={speed}
                  onValueChange={onSpeed}
                  minimumTrackTintColor={orbColor}
                  maximumTrackTintColor={Colors.bg4}
                  thumbTintColor={orbColor}
                />
              </View>
            )}
          </>
        )}

        {!connected && (
          <Text style={styles.hint}>Connect on the Device tab to control the lights.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const ORB = 220;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2, alignItems: 'stretch' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerText: { flex: 1 },
  brand: { color: Colors.text, fontSize: 30, fontWeight: '800', letterSpacing: 1 },
  tagline: { color: Colors.muted, fontSize: 13, marginBottom: Spacing.lg },

  orbWrap: {
    height: ORB + 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.md,
  },
  glow: { position: 'absolute', borderRadius: Radius.full },
  glowOuter: { width: ORB + 56, height: ORB + 56, opacity: 0.1 },
  glowInner: { width: ORB + 24, height: ORB + 24, opacity: 0.14 },
  orb: {
    width: ORB,
    height: ORB,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbState: { fontSize: 40, fontWeight: '800', letterSpacing: 2 },
  orbSub: { fontSize: 13, marginTop: 4 },

  sliderBlock: { marginTop: Spacing.lg },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  sliderLabel: { color: Colors.text, fontSize: 14 },
  sliderValue: { color: Colors.muted, fontSize: 14 },

  section: {
    color: Colors.muted,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: {
    width: '48.5%',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  tileEmoji: { fontSize: 22 },
  tileLabel: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  tileBlurb: { color: Colors.muted, fontSize: 11, marginTop: 2, lineHeight: 15 },

  segment: { flexDirection: 'row', justifyContent: 'space-between' },
  segItem: {
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  segLabel: { fontSize: 14, fontWeight: '700' },
  segBlurb: { fontSize: 10, marginTop: 2 },

  nudge: {
    marginTop: Spacing.md,
    borderColor: Colors.battery.low,
    borderWidth: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.battery.low + '18',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  nudgeText: { color: Colors.battery.low, fontSize: 12, fontWeight: '600', textAlign: 'center' },

  safetyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  safetyBtn: {
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  safetyText: { fontSize: 13, fontWeight: '700' },

  presetRow: { flexDirection: 'row', justifyContent: 'space-between' },
  preset: {
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  presetText: { fontSize: 13, fontWeight: '600' },

  hint: { color: Colors.muted, fontSize: 13, textAlign: 'center', marginTop: Spacing.xl },
});
