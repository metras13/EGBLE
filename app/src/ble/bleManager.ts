/**
 * EGBLE - BLE connection layer
 *
 * Wraps react-native-ble-plx behind a small interface, in the same spirit as
 * MOOD's light-provider abstraction: the screens and store never touch the
 * radio directly. Adapt MOOD's permission and scan flow here when wiring the
 * real app.
 *
 * Graceful disconnect is a first-class concern. If the link drops, the
 * controller keeps running its last pattern, so this layer surfaces
 * connection changes and lets the UI show a "reconnecting" state rather than
 * implying the lights went dark.
 */

import { BleManager, Device, Subscription } from 'react-native-ble-plx';
import {
  EGBLE_SERVICE_UUID,
  EGBLE_CMD_UUID,
  EGBLE_STATE_UUID,
  EGBLE_SCENE_UUID,
  EGBLE_NAME_PREFIX,
} from './uuids';
import { encodeBase64, decodeBase64 } from './base64';
import { DeviceState, SceneList, parseState, parseScenes } from './protocol';

export type ConnectionStatus =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface BleCallbacks {
  onStatus: (status: ConnectionStatus, detail?: string) => void;
  onState: (state: DeviceState) => void;
  onScenes: (scenes: SceneList) => void;
  onDeviceFound: (id: string, name: string) => void;
}

class EgbleBle {
  private manager = new BleManager();
  private device: Device | null = null;
  private stateSub: Subscription | null = null;
  private cb: BleCallbacks | null = null;

  init(cb: BleCallbacks) {
    this.cb = cb;
  }

  /** Scan for EGBLE controllers. Results arrive via onDeviceFound. */
  startScan() {
    this.cb?.onStatus('scanning');
    this.manager.startDeviceScan(
      [EGBLE_SERVICE_UUID],
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          this.cb?.onStatus('error', error.message);
          return;
        }
        if (!device) return;
        const name = device.name ?? device.localName ?? '';
        // The service filter is the primary gate; the name check is a fallback
        // for stacks that do not honor the service filter during scan.
        if (name.startsWith(EGBLE_NAME_PREFIX) || device.serviceUUIDs?.includes(EGBLE_SERVICE_UUID)) {
          this.cb?.onDeviceFound(device.id, name || 'EGBLE Controller');
        }
      },
    );
  }

  stopScan() {
    this.manager.stopDeviceScan();
  }

  async connect(deviceId: string): Promise<void> {
    this.stopScan();
    this.cb?.onStatus('connecting');
    try {
      const device = await this.manager.connectToDevice(deviceId, { requestMTU: 247 });
      await device.discoverAllServicesAndCharacteristics();
      this.device = device;

      device.onDisconnected((_err, _dev) => {
        this.cb?.onStatus('reconnecting');
        this.stateSub?.remove();
        this.stateSub = null;
      });

      this.subscribeState(device);
      await this.readScenes();
      await this.readState();   // reads carry the full payload; notify may truncate
      this.cb?.onStatus('connected', device.name ?? undefined);
    } catch (e: any) {
      this.cb?.onStatus('error', e?.message ?? 'connect failed');
    }
  }

  async disconnect(): Promise<void> {
    this.stateSub?.remove();
    this.stateSub = null;
    if (this.device) {
      try {
        await this.manager.cancelDeviceConnection(this.device.id);
      } catch {
        // Already gone; nothing to do.
      }
      this.device = null;
    }
    this.cb?.onStatus('idle');
  }

  private subscribeState(device: Device) {
    this.stateSub = device.monitorCharacteristicForService(
      EGBLE_SERVICE_UUID,
      EGBLE_STATE_UUID,
      (error, char) => {
        if (error || !char?.value) return;
        const state = parseState(decodeBase64(char.value));
        if (state) this.cb?.onState(state);
      },
    );
  }

  /** Write a JSON command to the command characteristic. */
  async sendCommand(json: string): Promise<void> {
    if (!this.device) return;
    // Write WITH response so the firmware has applied the command (and updated
    // its state characteristic) before we read state back. Without-response
    // writes could race the read.
    await this.device.writeCharacteristicWithResponseForService(
      EGBLE_SERVICE_UUID,
      EGBLE_CMD_UUID,
      encodeBase64(json),
    );
    // Pull the authoritative state via a read (not notify): the full per-channel
    // JSON exceeds one notification at the negotiated MTU, so notifications get
    // truncated. Reads return the complete value.
    await this.readState();
  }

  /** Read the full per-channel state from the state characteristic. */
  async readState(): Promise<void> {
    if (!this.device) return;
    const char = await this.device.readCharacteristicForService(
      EGBLE_SERVICE_UUID,
      EGBLE_STATE_UUID,
    );
    if (char?.value) {
      const state = parseState(decodeBase64(char.value));
      if (state) this.cb?.onState(state);
    }
  }

  /** Write a JSON scene action to the scene characteristic. */
  async sendScene(json: string): Promise<void> {
    if (!this.device) return;
    await this.device.writeCharacteristicWithResponseForService(
      EGBLE_SERVICE_UUID,
      EGBLE_SCENE_UUID,
      encodeBase64(json),
    );
    // The list may have changed (a save/delete); re-read it.
    await this.readScenes();
  }

  /** Read the scene list from the scene characteristic. */
  async readScenes(): Promise<void> {
    if (!this.device) return;
    const char = await this.device.readCharacteristicForService(
      EGBLE_SERVICE_UUID,
      EGBLE_SCENE_UUID,
    );
    if (char?.value) {
      const scenes = parseScenes(decodeBase64(char.value));
      if (scenes) this.cb?.onScenes(scenes);
    }
  }
}

export const ble = new EgbleBle();
