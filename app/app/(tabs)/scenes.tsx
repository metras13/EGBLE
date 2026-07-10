/**
 * EGBLE - Scenes and live triggers
 *
 * Big momentary trigger buttons up top for immediate actions (turn signals,
 * SOS, stop). Below: recall a built-in scene, or save/load/delete the eight
 * NVS slots on the controller.
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
import { useAppStore } from '../../src/store/appStore';
import { ConnectionBanner } from '../../src/components/ConnectionBanner';
import { Section } from '../../src/components/ui';
import { Colors, Radius, Spacing } from '../../src/constants/colors';
import { TriggerAction } from '../../src/ble/protocol';

const TRIGGERS: { action: TriggerAction; label: string; color: string }[] = [
  { action: 'left', label: 'Left', color: Colors.warn },
  { action: 'right', label: 'Right', color: Colors.warn },
  { action: 'sos', label: 'SOS', color: Colors.danger },
  { action: 'stop', label: 'Stop', color: Colors.muted },
];

export default function Scenes() {
  const trigger = useAppStore((s) => s.trigger);
  const scenes = useAppStore((s) => s.scenes);
  const recallBuiltin = useAppStore((s) => s.recallBuiltin);
  const saveScene = useAppStore((s) => s.saveScene);
  const loadScene = useAppStore((s) => s.loadScene);
  const deleteScene = useAppStore((s) => s.deleteScene);

  const [name, setName] = useState('');

  const firstEmpty = scenes.slots.find((s) => s.name === null);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Scenes</Text>
        <ConnectionBanner />

        <Section title="Live triggers">
          <View style={styles.triggerRow}>
            {TRIGGERS.map((t) => (
              <Pressable
                key={t.action}
                style={[styles.trigger, { borderColor: t.color }]}
                onPress={() => trigger(t.action)}
              >
                <Text style={[styles.triggerText, { color: t.color }]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="Built-in scenes">
          {scenes.builtins.map((b) => (
            <Pressable key={b} style={styles.row} onPress={() => recallBuiltin(b)}>
              <Text style={styles.rowText}>{b}</Text>
              <Text style={styles.rowAction}>Recall</Text>
            </Pressable>
          ))}
        </Section>

        <Section title="Saved slots">
          <View style={styles.saveRow}>
            <TextInput
              style={styles.input}
              placeholder="Name a new scene"
              placeholderTextColor={Colors.muted}
              value={name}
              onChangeText={setName}
            />
            <Pressable
              style={[
                styles.saveBtn,
                { opacity: name && firstEmpty ? 1 : 0.4 },
              ]}
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

          {scenes.slots
            .filter((s) => s.name !== null)
            .map((s) => (
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
          {scenes.slots.every((s) => s.name === null) ? (
            <Text style={styles.hint}>No saved scenes yet.</Text>
          ) : null}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  title: { color: Colors.text, fontSize: 26, fontWeight: '700', marginBottom: Spacing.lg },
  triggerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  trigger: {
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    backgroundColor: Colors.bg2,
  },
  triggerText: { fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },
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
  rowAction: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: Spacing.lg,
  },
  saveRow: { flexDirection: 'row', marginBottom: Spacing.md },
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
  hint: { color: Colors.muted, fontSize: 13 },
});
