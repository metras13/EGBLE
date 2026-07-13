import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '../../src/constants/colors';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.45, marginBottom: -2 }}>
      {emoji}
    </Text>
  );
}

export default function TabLayout() {
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
