/**
 * EGBLE - connection banner
 *
 * Always-truthful connection state. On a dropped link it shows "reconnecting"
 * rather than implying the lights are off, because the controller keeps running
 * its last pattern on its own.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useAppStore } from '../store/appStore';
import { Colors, Radius, Spacing } from '../constants/colors';

const LABEL: Record<string, string> = {
  idle: 'Not connected',
  scanning: 'Scanning',
  connecting: 'Connecting',
  connected: 'Connected',
  reconnecting: 'Reconnecting, lights still running',
  error: 'Connection error',
};

const COLOR: Record<string, string> = {
  idle: Colors.muted,
  scanning: Colors.warn,
  connecting: Colors.warn,
  connected: Colors.success,
  reconnecting: Colors.warn,
  error: Colors.danger,
};

export function ConnectionBanner() {
  const status = useAppStore((s) => s.status);
  const detail = useAppStore((s) => s.statusDetail);
  const color = COLOR[status] ?? Colors.muted;

  return (
    <View style={[styles.banner, { borderColor: color + '55' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.text}>{LABEL[status] ?? status}</Text>
      {status === 'error' && detail ? (
        <Text style={styles.detail} numberOfLines={1}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg2,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: Spacing.sm },
  text: { color: Colors.text, fontSize: 13, fontWeight: '600' },
  detail: { color: Colors.muted, fontSize: 12, marginLeft: Spacing.sm, flex: 1 },
});
