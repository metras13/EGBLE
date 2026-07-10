/**
 * EGBLE - Device screen
 *
 * Scan and connect to a controller, and per-channel brightness calibration so
 * different EL products can be matched. Calibration feeds the firmware's
 * per-channel gamma scale.
 */

import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/store/appStore';
import { ConnectionBanner } from '../../src/components/ConnectionBanner';
import { Section, SliderRow } from '../../src/components/ui';
import { Colors, Radius, Spacing } from '../../src/constants/colors';

export default function Settings() {
  const status = useAppStore((s) => s.status);
  const devices = useAppStore((s) => s.devices);
  const channels = useAppStore((s) => s.channels);
  const scan = useAppStore((s) => s.scan);
  const stopScan = useAppStore((s) => s.stopScan);
  const connect = useAppStore((s) => s.connect);
  const disconnect = useAppStore((s) => s.disconnect);
  const calibrate = useAppStore((s) => s.calibrate);

  const connected = status === 'connected';
  const scanning = status === 'scanning';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Device</Text>
        <ConnectionBanner />

        <Section title="Connection">
          {connected ? (
            <Pressable style={[styles.btn, styles.btnDanger]} onPress={disconnect}>
              <Text style={styles.btnText}>Disconnect</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.btn}
              onPress={scanning ? stopScan : scan}
            >
              <Text style={styles.btnText}>
                {scanning ? 'Stop scanning' : 'Scan for controllers'}
              </Text>
            </Pressable>
          )}

          {!connected &&
            devices.map((d) => (
              <Pressable key={d.id} style={styles.deviceRow} onPress={() => connect(d.id)}>
                <Text style={styles.deviceName}>{d.name}</Text>
                <Text style={styles.deviceConnect}>Connect</Text>
              </Pressable>
            ))}
          {!connected && scanning && devices.length === 0 ? (
            <Text style={styles.hint}>Looking for nearby EGBLE controllers...</Text>
          ) : null}
        </Section>

        {connected && channels.length > 0 ? (
          <Section title="Brightness calibration">
            <Text style={styles.hint}>
              Trim each channel so different EL products match. Scales the
              gamma-corrected output on the controller.
            </Text>
            <View style={{ height: Spacing.md }} />
            {channels.map((ch, i) => (
              <SliderRow
                key={i}
                label={`Channel ${i}`}
                value={ch.scale}
                min={0}
                max={100}
                step={1}
                unit="%"
                onChange={(v) => calibrate(i, v)}
              />
            ))}
          </Section>
        ) : null}

        <Section title="About">
          <Text style={styles.hint}>
            EGBLE controller. Patterns run on the device and keep going if this
            app disconnects. Firmware version shows once connected.
          </Text>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  title: { color: Colors.text, fontSize: 26, fontWeight: '700', marginBottom: Spacing.lg },
  btn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  btnDanger: { backgroundColor: Colors.danger },
  btnText: { color: Colors.bg, fontWeight: '700', fontSize: 15 },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  deviceName: { color: Colors.text, fontSize: 15 },
  deviceConnect: { color: Colors.accent, fontWeight: '600' },
  hint: { color: Colors.muted, fontSize: 13, lineHeight: 19 },
});
