import { Tabs, Redirect } from 'expo-router';
import { Text, View } from 'react-native';
import { Colors } from '../../src/constants/colors';
import { useAppStore } from '../../src/store/appStore';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.45, marginBottom: -2 }}>
      {emoji}
    </Text>
  );
}

export default function TabLayout() {
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const onboarded = useAppStore((s) => s.onboarded);

  // Wait for persisted state before deciding, so returning users do not flash
  // the walkthrough. First-timers land on onboarding.
  if (!hasHydrated) return <View style={{ flex: 1, backgroundColor: Colors.bg }} />;
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bg2,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 58,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.muted,
        tabBarLabelStyle: {
          fontSize: 9,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon emoji="⬤" focused={focused} /> }}
      />
      <Tabs.Screen
        name="channels"
        options={{ title: 'Channels', tabBarIcon: ({ focused }) => <TabIcon emoji="🎛" focused={focused} /> }}
      />
      <Tabs.Screen
        name="scenes"
        options={{ title: 'Scenes', tabBarIcon: ({ focused }) => <TabIcon emoji="✨" focused={focused} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Device', tabBarIcon: ({ focused }) => <TabIcon emoji="📡" focused={focused} /> }}
      />
    </Tabs>
  );
}
