/**
 * Ware - Battery indicator
 *
 * Shows the mounted swap cell's charge as a small battery pill, colored by tier
 * (white good / orange low / red critical) to mirror the backlit label on the
 * hardware. Renders nothing when the device reports no battery, so boards
 * without a VBAT sense degrade gracefully.
 */

import { View, Text, StyleSheet } from 'react-native';
import { useAppStore } from '../store/appStore';
import { Colors, Radius } from '../constants/colors';
import { batteryTier } from '../ble/protocol';

function tierColor(pct: number, charging: boolean): string {
  if (charging) return Colors.battery.charging;
  const t = batteryTier(pct);
  return t === 'critical' ? Colors.battery.critical : t === 'low' ? Colors.battery.low : Colors.battery.good;
}

export function BatteryIndicator() {
  const battery = useAppStore((s) => s.battery);
  if (!battery.present) return null;

  const color = tierColor(battery.pct, battery.charging);
  const fill = Math.max(6, Math.min(100, battery.pct));

  return (
    <View style={styles.row}>
      <View style={styles.body}>
        <View style={[styles.fill, { width: `${fill}%`, backgroundColor: color }]} />
      </View>
      <View style={[styles.nub, { backgroundColor: color }]} />
      <Text style={[styles.pct, { color }]}>
        {battery.charging ? `Charging ${battery.pct}%` : `${battery.pct}%`}
      </Text>
    </View>
  );
}

/**
 * A full-width warning strip for a critically low battery. Returns null unless
 * the charge is critical and not charging. Use on the Home screen.
 */
export function LowBatteryBanner() {
  const battery = useAppStore((s) => s.battery);
  if (!battery.present || battery.charging || batteryTier(battery.pct) !== 'critical') return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>Battery low ({battery.pct}%) - swap or charge soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  body: {
    width: 30,
    height: 15,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: Colors.muted,
    padding: 1.5,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 1.5 },
  nub: { width: 2.5, height: 6, borderTopRightRadius: 2, borderBottomRightRadius: 2, marginLeft: 1 },
  pct: { marginLeft: 7, fontSize: 13, fontWeight: '700' },

  banner: {
    backgroundColor: Colors.battery.critical + '22',
    borderColor: Colors.battery.critical,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  bannerText: { color: Colors.battery.critical, fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
