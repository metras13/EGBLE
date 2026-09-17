/**
 * Ware - Vibe
 *
 * The "pick a look" tab. A gallery of one-tap Vibe cards (Steady, Breathe,
 * Campfire, Party, Cadence, Beacon, Music, SOS) that broadcast a pattern to
 * every channel. Pick one, nudge Speed, then save it into one of the eight
 * controller slots as your own. The safety triggers deliberately live on Home,
 * not here, so this tab has one clear job: vibes.
 */

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { useAppStore } from '../../src/store/appStore';
import { ConnectionBanner } from '../../src/components/ConnectionBanner';
import { Section } from '../../src/components/ui';
import { Colors, Radius, Spacing } from '../../src/constants/colors';
import { VIBES, Vibe } from '../../src/constants/vibes';
import { effectiveBrightness } from '../../src/constants/activities';
import { DEFAULT_PATTERN } from '../../src/constants/patterns';

export default function Vibe() {
  const status = useAppStore((s) => s.status);
  const channels = useAppStore((s) => s.channels);
  const brightness = useAppStore((s) => s.masterBrightness);
  const powerMode = useAppStore((s) => s.powerMode);
  const setAllPattern = useAppStore((s) => s.setAllPattern);
  const scenes = useAppStore((s) => s.scenes);
  const recallBuiltin = useAppStore((s) => s.recallBuiltin);
  const saveScene = useAppStore((s) => s.saveScene);
  const loadScene = useAppStore((s) => s.loadScene);
  const deleteScene = useAppStore((s) => s.deleteScene);

  const [active, setActive] = useState<Vibe | null>(null);
  const [speed, setSpeed] = useState(50);
  const [name, setName] = useState('');

  const connected = status === 'connected' || status === 'reconnecting';
  const isOn = channels.length > 0 && channels.some((c) => c.pattern !== 'OFF');
  const firstEmpty = scenes.slots.find((s) => s.name === null);
  const savedSlots = scenes.slots.filter((s) => s.name !== null);

  const applyVibe = (v: Vibe, spd = speed) => {
    setActive(v);
    setAllPattern(v.build(effectiveBrightness(brightness, powerMode), spd));
  };

  const onSpeed = (v: number) => {
    setSpeed(v);
    if (active && active.usesSpeed && isOn) applyVibe(active, v);
  };

  const turnOff = () => {
    setActive(null);
    setAllPattern({ ...DEFAULT_PATTERN, type: 'OFF' });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Vibe</Text>
        <ConnectionBanner />

        <Section title="Tap a vibe">
          <View style={styles.grid}>
            {VIBES.map((v) => {
              const on = active?.key === v.key && isOn;
              return (
                <Pressable
                  key={v.key}
                  style={[
                    styles.card,
                    { borderColor: on ? v.color : Colors.border },
                    on && { backgroundColor: '#141a2b' },
                  ]}
                  onPress={() => applyVibe(v)}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.icon}>{v.icon}</Text>
                    {v.beta ? <Text style={styles.beta}>BETA</Text> : null}
                  </View>
                  <Text style={[styles.cardLabel, on && { color: v.color }]}>{v.label}</Text>
                  <Text style={styles.cardBlurb}>{v.blurb}</Text>
                </Pressable>
              );
            })}
          </View>
          {!connected ? (
            <Text style={styles.hint}>Connect your Ware to apply a vibe.</Text>
          ) : null}
        </Section>

        {active ? (
          <Section title={`Tune "${active.label}"`}>
            {active.usesSpeed ? (
              <View style={styles.sliderBlock}>
                <View style={styles.sliderHead}>
                  <Text style={styles.sliderLabel}>Speed</Text>
                  <Text style={styles.sliderVal}>{speed}%</Text>
                </View>
                <Slider
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={speed}
                  onValueChange={onSpeed}
                  minimumTrackTintColor={active.color}
                  maximumTrackTintColor={Colors.border}
                  thumbTintColor={active.color}
                />
              </View>
            ) : (
              <Text style={styles.hint}>This vibe has no speed to adjust.</Text>
            )}

            <View style={styles.saveRow}>
              <TextInput
                style={styles.input}
                placeholder={`Save as (e.g. "${active.label} mix")`}
                placeholderTextColor={Colors.muted}
                value={name}
                onChangeText={setName}
              />
              <Pressable
                style={[styles.saveBtn, { opacity: name && firstEmpty ? 1 : 0.4 }]}
                disabled={!name || !firstEmpty}
                onPress={() => {
                  if (firstEmpty) {
                    saveScene(firstEmpty.slot, name);
                    setName('');
                  }
                }}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
            {!firstEmpty ? (
              <Text style={styles.hint}>All 8 slots are full. Delete one below to save a new vibe.</Text>
            ) : null}

            <Pressable style={styles.offBtn} onPress={turnOff}>
              <Text style={styles.offText}>Turn off</Text>
            </Pressable>
          </Section>
        ) : null}

        {savedSlots.length > 0 ? (
          <Section title="Your saved vibes">
            {savedSlots.map((s) => (
              <View key={s.slot} style={styles.row}>
                <Text style={styles.rowText}>{s.name}</Text>
                <Pressable onPress={() => loadScene(s.slot)}>
                  <Text style={styles.rowAction}>Load</Text>
                </Pressable>
                <Pressable onPress={() => deleteScene(s.slot)}>
                  <Text style={[styles.rowAction, { color: Colors.danger }]}>Delete</Text>
                </Pressable>
              </View>
            ))}
          </Section>
        ) : null}

        {scenes.builtins.length > 0 ? (
          <Section title="On your controller">
            {scenes.builtins.map((b) => (
              <Pressable key={b} style={styles.row} onPress={() => recallBuiltin(b)}>
                <Text style={styles.rowText}>{b}</Text>
                <Text style={styles.rowAction}>Recall</Text>
              </Pressable>
            ))}
          </Section>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  title: { color: Colors.text, fontSize: 26, fontWeight: '700', marginBottom: Spacing.lg },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%',
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  icon: { fontSize: 24 },
  beta: {
    color: Colors.warn,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    borderWidth: 1,
    borderColor: Colors.warn,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  cardLabel: { color: Colors.text, fontSize: 16, fontWeight: '700', marginTop: Spacing.sm },
  cardBlurb: { color: Colors.muted, fontSize: 11, marginTop: 2 },

  sliderBlock: { marginBottom: Spacing.md },
  sliderHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  sliderLabel: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  sliderVal: { color: Colors.muted, fontSize: 13 },

  saveRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  input: {
    flex: 1,
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  saveBtnText: { color: Colors.bg, fontWeight: '700' },

  offBtn: {
    marginTop: Spacing.sm,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  offText: { color: Colors.muted, fontSize: 13, fontWeight: '600' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rowText: { color: Colors.text, fontSize: 15, flex: 1 },
  rowAction: { color: Colors.accent, fontSize: 13, fontWeight: '600', marginLeft: Spacing.lg },
  hint: { color: Colors.muted, fontSize: 13, marginTop: Spacing.xs },
});
