/**
 * Ware - onboarding walkthrough
 *
 * Shown once on first launch (gated by the persisted `onboarded` flag). Explains
 * what Ware does and the core use cases, how to connect over Bluetooth, and lets
 * the user pick how many channels their controller uses. The final step offers
 * Demo Mode so someone with no hardware (including an App Review tester) can
 * explore the whole app.
 */

import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/appStore';
import { Colors, Radius, Spacing } from '../src/constants/colors';
import { APP_NAME } from '../src/constants/brand';

function Orb() {
  return (
    <View style={styles.orbWrap}>
      <View style={[styles.glow, { width: 200, height: 200, opacity: 0.12 }]} />
      <View style={[styles.glow, { width: 160, height: 160, opacity: 0.16 }]} />
      <View style={styles.orb} />
    </View>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const channelCount = useAppStore((s) => s.channelCount);
  const setChannelCount = useAppStore((s) => s.setChannelCount);
  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const enableDemo = useAppStore((s) => s.enableDemo);

  const LAST = 4;

  const finish = (demo: boolean) => {
    if (demo) enableDemo();
    setOnboarded(true);
    router.replace(demo ? '/' : '/settings');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        {step === 0 && (
          <View style={styles.slide}>
            <Orb />
            <Text style={styles.brand}>{APP_NAME}</Text>
            <Text style={styles.lead}>Wearable light control</Text>
            <Text style={styles.text}>
              Turn EL wire, tape, and panels into lights you control from your
              phone. Brightness, patterns, and effects, all over Bluetooth.
            </Text>
          </View>
        )}

        {step === 1 && (
          <View style={styles.slide}>
            <Text style={styles.title}>Built for wearables, and more</Text>
            <Bullet emoji="🧥" text="Light up jackets, vests, and costumes" />
            <Bullet emoji="📡" text="Trigger effects remotely over Bluetooth" />
            <Bullet emoji="🎞" text="Sequence multiple panels for signs and displays" />
            <Bullet emoji="⚠️" text="Safety patterns like SOS and turn signals" />
          </View>
        )}

        {step === 2 && (
          <View style={styles.slide}>
            <Text style={styles.title}>Connect in seconds</Text>
            <Text style={styles.text}>
              Power your {APP_NAME} controller, open the Device tab, and tap Scan.
              {APP_NAME} finds it over Bluetooth automatically and stays in sync.
            </Text>
            <Text style={styles.text}>
              If the connection drops, your lights keep running their last pattern
              on the controller itself, so nothing goes dark unexpectedly.
            </Text>
          </View>
        )}

        {step === 3 && (
          <View style={styles.slide}>
            <Text style={styles.title}>How many channels?</Text>
            <Text style={styles.text}>
              A {APP_NAME} controller drives up to six independent light channels.
              Set how many your build uses. You can change this later.
            </Text>
            <View style={styles.stepper}>
              <Pressable
                style={styles.stepBtn}
                onPress={() => setChannelCount(channelCount - 1)}
              >
                <Text style={styles.stepBtnText}>-</Text>
              </Pressable>
              <Text style={styles.stepValue}>{channelCount}</Text>
              <Pressable
                style={styles.stepBtn}
                onPress={() => setChannelCount(channelCount + 1)}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={styles.slide}>
            <Orb />
            <Text style={styles.title}>Ready to glow</Text>
            <Text style={styles.text}>
              Connect your controller to get started, or explore the whole app in
              Demo Mode with a simulated controller, no hardware needed.
            </Text>
            <Pressable style={styles.primary} onPress={() => finish(false)}>
              <Text style={styles.primaryText}>I have a controller</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={() => finish(true)}>
              <Text style={styles.secondaryText}>Explore in Demo Mode</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Progress dots */}
      <View style={styles.dots}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: i === step ? Colors.accent : Colors.bg4 }]}
          />
        ))}
      </View>

      {/* Nav */}
      <View style={styles.nav}>
        <Pressable onPress={() => (step > 0 ? setStep(step - 1) : finish(false))}>
          <Text style={styles.navText}>{step > 0 ? 'Back' : 'Skip'}</Text>
        </Pressable>
        {step < LAST ? (
          <Pressable style={styles.next} onPress={() => setStep(step + 1)}>
            <Text style={styles.nextText}>Next</Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>
    </SafeAreaView>
  );
}

function Bullet({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletEmoji}>{emoji}</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  slide: { alignItems: 'center' },
  orbWrap: { height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  glow: { position: 'absolute', borderRadius: Radius.full, backgroundColor: Colors.accent },
  orb: {
    width: 130, height: 130, borderRadius: Radius.full,
    backgroundColor: Colors.accent, borderWidth: 2, borderColor: Colors.accent,
  },
  brand: { color: Colors.text, fontSize: 40, fontWeight: '800', letterSpacing: 1 },
  lead: { color: Colors.accent, fontSize: 16, marginTop: 4, marginBottom: Spacing.lg },
  title: { color: Colors.text, fontSize: 26, fontWeight: '700', marginBottom: Spacing.lg, textAlign: 'center' },
  text: { color: Colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: Spacing.md },
  bullet: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginBottom: Spacing.lg },
  bulletEmoji: { fontSize: 24, marginRight: Spacing.md },
  bulletText: { color: Colors.text, fontSize: 16, flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg },
  stepBtn: {
    width: 56, height: 56, borderRadius: Radius.full, backgroundColor: Colors.bg3,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { color: Colors.accent, fontSize: 28, fontWeight: '700' },
  stepValue: { color: Colors.text, fontSize: 44, fontWeight: '800', marginHorizontal: Spacing.xl, minWidth: 60, textAlign: 'center' },
  primary: {
    alignSelf: 'stretch', backgroundColor: Colors.accent, borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.lg,
  },
  primaryText: { color: Colors.bg, fontWeight: '700', fontSize: 16 },
  secondary: {
    alignSelf: 'stretch', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md,
  },
  secondaryText: { color: Colors.text, fontWeight: '600', fontSize: 16 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: Spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  nav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg,
  },
  navText: { color: Colors.muted, fontSize: 16 },
  next: {
    backgroundColor: Colors.bg3, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl,
  },
  nextText: { color: Colors.accent, fontSize: 16, fontWeight: '600' },
});
