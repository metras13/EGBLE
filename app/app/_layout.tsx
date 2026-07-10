import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '../src/store/appStore';

export default function RootLayout() {
  const initBle = useAppStore((s) => s.initBle);

  // Wire the BLE manager callbacks into the store once, on launch.
  useEffect(() => {
    initBle();
  }, [initBle]);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
