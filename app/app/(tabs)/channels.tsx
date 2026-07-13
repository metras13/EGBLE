/**
 * EGBLE - Channel dashboard
 *
 * Lists the six channels with a quick enable toggle and current pattern. Tap a
 * channel to expand the editor: pattern type, the params that type uses, and
 * group assignment. State shown comes from the firmware's notifications, not
 * from optimistic local writes.
 */

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/appStore';
import { ConnectionBanner } from '../../src/components/ConnectionBanner';
import { Chip, SliderRow } from '../../src/components/ui';
import { Colors, Radius, Spacing } from '../../src/constants/colors';
import {
  PatternType,
  PATTERN_TYPES,
  PATTERN_FIELDS,
  FIELD_LABELS,
  FIELD_RANGES,
  DEFAULT_PATTERN,
  PatternConfig,
} from '../../src/constants/patterns';
import { ChannelState } from '../../src/ble/protocol';

export default function Channels() {
  const channels = useAppStore((s) => s.channels);
  const status = useAppStore((s) => s.status);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Channels</Text>
        <ConnectionBanner />

        {channels.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {status === 'connected'
                ? 'Waiting for controller state...'
                : 'Connect to a controller on the Device tab.'}
            </Text>
          </View>
        ) : (
          channels.map((ch, i) => <ChannelCard key={i} index={i} state={ch} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ChannelCard({ index, state }: { index: number; state: ChannelState }) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<PatternConfig>({
    ...DEFAULT_PATTERN,
    type: state.pattern,
    bri: state.bri,
  });

  const toggleEnabled = useAppStore((s) => s.toggleEnabled);
  const setPattern = useAppStore((s) => s.setPattern);
  const assignGroup = useAppStore((s) => s.assignGroup);

  const accent = Colors.pattern[state.pattern] ?? Colors.accent;

  const apply = (next: PatternConfig) => {
    setDraft(next);
    setPattern(index, next);
  };

  const pickType = (type: PatternType) => apply({ ...draft, type });
  const setField = (k: keyof PatternConfig, v: number) => apply({ ...draft, [k]: v });

  return (
    <View style={[styles.card, { borderColor: accent + '33' }]}>
      <Pressable style={styles.cardHead} onPress={() => setExpanded((e) => !e)}>
        <View style={[styles.level, { borderColor: accent }]}>
          <View
            style={{
              height: `${Math.round((state.level / 255) * 100)}%`,
              backgroundColor: accent,
            }}
          />
        </View>
        <View style={styles.cardHeadText}>
          <Text style={styles.chName}>Channel {index}</Text>
          <Text style={[styles.chPattern, { color: accent }]}>
            {state.pattern}
            {state.groupId > 0 ? `  ·  group ${state.groupId}` : ''}
          </Text>
        </View>
        <Switch
          value={state.enabled}
          onValueChange={(v) => toggleEnabled(index, v)}
          trackColor={{ false: Colors.bg4, true: Colors.accent + '88' }}
          thumbColor={state.enabled ? Colors.accent : Colors.muted}
        />
      </Pressable>

      {expanded && (
        <View style={styles.editor}>
          <Text style={styles.editorLabel}>Pattern</Text>
          <View style={styles.chipWrap}>
            {PATTERN_TYPES.map((t) => (
              <Chip
                key={t}
                label={t}
                active={draft.type === t}
                color={Colors.pattern[t]}
                onPress={() => pickType(t)}
              />
            ))}
          </View>

          {PATTERN_FIELDS[draft.type].map((f) => {
            const range = FIELD_RANGES[f]!;
            return (
              <SliderRow
                key={f}
                label={FIELD_LABELS[f] ?? f}
                value={draft[f]}
                min={range[0]}
                max={range[1]}
                step={range[2]}
                unit={f === 'bri' ? '' : ' ms'}
                onChange={(v) => setField(f, v)}
              />
            );
          })}

          <Text style={styles.editorLabel}>Group</Text>
          <View style={styles.chipWrap}>
            {[0, 1, 2, 3].map((g) => (
              <Chip
                key={g}
                label={g === 0 ? 'None' : `Group ${g}`}
                active={state.groupId === g}
                onPress={() => assignGroup(index, g)}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  title: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: Spacing.lg,
  },
  empty: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: { color: Colors.muted, textAlign: 'center', fontSize: 14 },
  card: {
    backgroundColor: Colors.bg2,
    borderWidth: 1,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  level: {
    width: 14,
    height: 40,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginRight: Spacing.md,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  cardHeadText: { flex: 1 },
  chName: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  chPattern: { fontSize: 12, marginTop: 2, letterSpacing: 0.5 },
  editor: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    padding: Spacing.md,
  },
  editorLabel: {
    color: Colors.muted,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
