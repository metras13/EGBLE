/**
 * Ware - Home
 *
 * The orb is the main control: tap to turn the light on or off, drag the
 * brightness slider to dim. Presets (Steady, Flame, Strobe, Fade) each apply a
 * pattern to every channel, with a speed slider for the active one. State is
 * read back from the controller's notifications so the orb reflects reality.
 */

import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { useAppStore } from '../../src/store/appStore';
import { ConnectionBanner } from '../../src/components/ConnectionBanner';
import { Colors, Radius, Spacing } from '../../src/constants/colors';
import { APP_NAME, APP_TAGLINE } from '../../src/constants/brand';
import { DEFAULT_PATTERN, PatternConfig, PatternType } from '../../src/constants/patterns';

type Preset = 'steady' | 'flame' | 'strobe' | 'fade';

const PRESETS: { key: Preset; label: string; type: PatternType; color: string }[] = [
  { key: 'steady', label: 'Steady', type: 'SOLID', color: Colors.accent },
  { key: 'flame', label: 'Flame', type: 'FLAME', color: Colors.pattern.FLAME },
  { key: 'strobe', label: 'Strobe', type: 'BLINK', color: Colors.pattern.BLINK },
  { key: 'fade', label: 'Fade', type: 'FADE_PULSE', color: Colors.pattern.FADE_PULSE },
];

// Map a 0..100 speed slider to a preset's timing. Higher speed = livelier.
function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * (t / 100));
}

function buildConfig(preset: Preset, bri: number, speed: number): PatternConfig {
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
  const brightness = useAppStore((s) => s.masterBrightness);
  const setBrightness = useAppStore((s) => s.setMasterBrightness);
  const setAllPattern = useAppStore((s) => s.setAllPattern);

  const [preset, setPreset] = useState<Preset>('steady');
  const [speed, setSpeed] = useState(50);

  const connected = status === 'connected' || status === 'reconnecting';
  const isOn = channels.length > 0 && channels.some((c) => c.pattern !== 'OFF');
  const active = PRESETS.find((p) => p.key === preset)!;
  const orbColor = active.color;

  const apply = (p: Preset, bri: number, spd: number) =>
    setAllPattern(buildConfig(p, bri, spd));

  const toggleOrb = () => {
    if (isOn) setAllPattern({ ...DEFAULT_PATTERN, type: 'OFF' });
    else apply(preset, brightness, speed);
  };

  const pickPreset = (p: Preset) => {
    setPreset(p);
    apply(p, brightness, speed); // selecting a preset turns the light on with it
  };

  const onBrightness = (v: number) => {
    setBrightness(v);
    if (isOn) apply(preset, v, speed);
  };

  const onSpeed = (v: number) => {
    setSpeed(v);
    if (isOn && preset !== 'steady') apply(preset, brightness, v);
  };

  const briPct = Math.round((brightness / 255) * 100);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>{APP_NAME}</Text>
        <Text style={styles.tagline}>{APP_TAGLINE}</Text>
        <ConnectionBanner />

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

        {/* Presets */}
        <Text style={styles.section}>Presets</Text>
        <View style={styles.presetRow}>
          {PRESETS.map((p) => {
            const on = preset === p.key;
            return (
              <Pressable
                key={p.key}
                onPress={() => pickPreset(p.key)}
                disabled={!connected}
                style={[
                  styles.preset,
                  {
                    borderColor: on ? p.color : Colors.border,
                    backgroundColor: on ? p.color + '22' : Colors.bg2,
                  },
                ]}
              >
                <Text style={[styles.presetText, { color: on ? p.color : Colors.text }]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Speed (not for Steady) */}
        {preset !== 'steady' && (
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
