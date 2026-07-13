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
import { ble, ConnectionStatus } from '../ble/bleManager';
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

  // Actions - lifecycle
  initBle: () => void;
  scan: () => void;
  stopScan: () => void;
  connect: (id: string) => void;
  disconnect: () => void;

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

      setMasterBrightness: (v) =>
        set({ masterBrightness: Math.max(0, Math.min(255, Math.round(v))) }),
      setChannelCount: (n) => set({ channelCount: Math.max(1, Math.min(6, Math.round(n))) }),
      setOnboarded: (v) => set({ onboarded: v }),

      setAllPattern: (cfg) => {
        ble.sendCommand(cmdPatternAll(cfg));
      },

      initBle: () => {
        ble.init({
          onStatus: (status, detail) =>
            set({ status, statusDetail: detail ?? '' }),
          onState: (state: DeviceState) => set({ channels: state.channels }),
          onScenes: (scenes: SceneList) => set({ scenes }),
          onDeviceFound: (id, name) =>
            set((s) =>
              s.devices.some((d) => d.id === id)
                ? s
                : { devices: [...s.devices, { id, name }] },
            ),
        });
      },

      scan: () => {
        set({ devices: [] });
        ble.startScan();
      },
      stopScan: () => ble.stopScan(),

      connect: (id) => {
        set({ lastDeviceId: id });
        ble.connect(id);
      },
      disconnect: () => ble.disconnect(),

      setPattern: (ch, cfg) => {
        ble.sendCommand(cmdPatternChannel(ch, cfg));
      },
      setGroupPattern: (gid, cfg) => {
        ble.sendCommand(cmdPatternGroup(gid, cfg));
      },
      toggleEnabled: (ch, on) => {
        ble.sendCommand(cmdEnable(ch, on));
      },
      assignGroup: (ch, gid) => {
        ble.sendCommand(cmdGroup(ch, gid));
      },
      calibrate: (ch, pct) => {
        ble.sendCommand(cmdScale(ch, pct));
      },
      trigger: (action) => {
        ble.sendCommand(cmdTrigger(action));
      },

      recallBuiltin: (name) => {
        ble.sendScene(cmdSceneRecall(name));
      },
      saveScene: (slot, name) => {
        ble.sendScene(cmdSceneSave(slot, name));
      },
      loadScene: (slot) => {
        ble.sendScene(cmdSceneLoad(slot));
      },
      deleteScene: (slot) => {
        ble.sendScene(cmdSceneDelete(slot));
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
    },
  ),
);
