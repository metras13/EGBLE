/**
 * EGBLE - App Store (Zustand)
 *
 * Follows the MOOD store pattern: a single persisted Zustand store with an
 * explicit partialize allowlist. Only the last connected device id is
 * persisted; all live controller state (channels, scenes, connection status)
 * is transient and comes from BLE notifications.
 *
 * Per the design rule, the UI renders from device state, not from optimistic
 * local assumptions. Actions send a command and then wait for the firmware's
 * state notification to update `channels`, so the display stays truthful even
 * if a write is dropped.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ble, ConnectionStatus, BleCallbacks } from '../ble/bleManager';
import { demo } from '../ble/demoController';
import {
  cmdPatternChannel,
  cmdPatternGroup,
  cmdEnable,
  cmdGroup,
  cmdScale,
  cmdTrigger,
  cmdSceneRecall,
  cmdSceneSave,
  cmdSceneLoad,
  cmdSceneDelete,
  cmdPatternAll,
  TriggerAction,
  ChannelState,
  DeviceState,
  SceneList,
} from '../ble/protocol';
import { PatternConfig } from '../constants/patterns';

interface FoundDevice {
  id: string;
  name: string;
}

interface AppState {
  // Connection
  status: ConnectionStatus;
  statusDetail: string;
  devices: FoundDevice[];
  lastDeviceId: string | null;

  // Live controller state (from notifications)
  channels: ChannelState[];
  scenes: SceneList;

  // User preferences (persisted)
  masterBrightness: number;   // 0..255, the orb dim level
  channelCount: number;       // how many channels this build uses (1..6)
  onboarded: boolean;         // has the splash walkthrough been seen

  // Demo Mode (not persisted): drive the app from an in-app simulator so every
  // screen works with no controller attached.
  demoMode: boolean;

  // True once persisted state has rehydrated. Gates the onboarding redirect so
  // a returning user does not flash the walkthrough before onboarded loads.
  hasHydrated: boolean;

  // Actions - lifecycle
  initBle: () => void;
  scan: () => void;
  stopScan: () => void;
  connect: (id: string) => void;
  disconnect: () => void;
  enableDemo: () => void;
  disableDemo: () => void;

  // Actions - preferences
  setMasterBrightness: (v: number) => void;
  setChannelCount: (n: number) => void;
  setOnboarded: (v: boolean) => void;

  // Actions - channel control
  setPattern: (ch: number, cfg: PatternConfig) => void;
  setGroupPattern: (gid: number, cfg: PatternConfig) => void;
  setAllPattern: (cfg: PatternConfig) => void;
  toggleEnabled: (ch: number, on: boolean) => void;
  assignGroup: (ch: number, gid: number) => void;
  calibrate: (ch: number, pct: number) => void;
  trigger: (action: TriggerAction) => void;

  // Actions - scenes
  recallBuiltin: (name: string) => void;
  saveScene: (slot: number, name: string) => void;
  loadScene: (slot: number) => void;
  deleteScene: (slot: number) => void;
}

const EMPTY_SCENES: SceneList = { builtins: [], slots: [] };

// The active controller backend: the real BLE controller, or the in-app demo
// simulator when Demo Mode is on. Both expose the same command/state surface,
// so the control actions do not care which is live. Hoisted; only called at
// runtime, by which point useAppStore is defined.
function active() {
  return useAppStore.getState().demoMode ? demo : ble;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      statusDetail: '',
      devices: [],
      lastDeviceId: null,
      channels: [],
      scenes: EMPTY_SCENES,

      masterBrightness: 200,
      channelCount: 6,
      onboarded: false,
      demoMode: false,
      hasHydrated: false,

      setMasterBrightness: (v) =>
        set({ masterBrightness: Math.max(0, Math.min(255, Math.round(v))) }),
      setChannelCount: (n) => set({ channelCount: Math.max(1, Math.min(6, Math.round(n))) }),
      setOnboarded: (v) => set({ onboarded: v }),

      setAllPattern: (cfg) => {
        active().sendCommand(cmdPatternAll(cfg));
      },

      initBle: () => {
        // Both backends share the same callbacks; only the active one emits.
        const cb: BleCallbacks = {
          onStatus: (status, detail) => set({ status, statusDetail: detail ?? '' }),
          onState: (state: DeviceState) => set({ channels: state.channels }),
          onScenes: (scenes: SceneList) => set({ scenes }),
          onDeviceFound: (id, name) =>
            set((s) =>
              s.devices.some((d) => d.id === id)
                ? s
                : { devices: [...s.devices, { id, name }] },
            ),
        };
        ble.init(cb);
        demo.init(cb);
      },

      scan: () => {
        if (get().demoMode) { demo.disconnect(); set({ demoMode: false }); }
        set({ devices: [] });
        ble.startScan();
      },
      stopScan: () => ble.stopScan(),

      connect: (id) => {
        if (get().demoMode) { demo.disconnect(); set({ demoMode: false }); }
        set({ lastDeviceId: id });
        ble.connect(id);
      },
      disconnect: () => {
        if (get().demoMode) { demo.disconnect(); set({ demoMode: false, channels: [] }); }
        else ble.disconnect();
      },

      enableDemo: () => {
        ble.disconnect();
        set({ demoMode: true, devices: [] });
        demo.connect();
      },
      disableDemo: () => {
        demo.disconnect();
        set({ demoMode: false, channels: [] });
      },

      setPattern: (ch, cfg) => {
        active().sendCommand(cmdPatternChannel(ch, cfg));
      },
      setGroupPattern: (gid, cfg) => {
        active().sendCommand(cmdPatternGroup(gid, cfg));
      },
      toggleEnabled: (ch, on) => {
        active().sendCommand(cmdEnable(ch, on));
      },
      assignGroup: (ch, gid) => {
        active().sendCommand(cmdGroup(ch, gid));
      },
      calibrate: (ch, pct) => {
        active().sendCommand(cmdScale(ch, pct));
      },
      trigger: (action) => {
        active().sendCommand(cmdTrigger(action));
      },

      recallBuiltin: (name) => {
        active().sendScene(cmdSceneRecall(name));
      },
      saveScene: (slot, name) => {
        active().sendScene(cmdSceneSave(slot, name));
      },
      loadScene: (slot) => {
        active().sendScene(cmdSceneLoad(slot));
      },
      deleteScene: (slot) => {
        active().sendScene(cmdSceneDelete(slot));
      },
    }),
    {
      name: 'egble-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // Reconnect target and user preferences survive restarts. Live controller
      // state (channels, scenes, connection) is not persisted.
      partialize: (state) => ({
        lastDeviceId: state.lastDeviceId,
        masterBrightness: state.masterBrightness,
        channelCount: state.channelCount,
        onboarded: state.onboarded,
      }),

      onRehydrateStorage: () => () => {
        useAppStore.setState({ hasHydrated: true });
      },
    },
  ),
);
