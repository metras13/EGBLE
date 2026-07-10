/**
 * EGBLE - GATT UUIDs
 *
 * These must match firmware/egble-controller/BleService.h and docs/protocol.md.
 * Keep all three in sync.
 */

export const EGBLE_SERVICE_UUID = '6b1e0001-8f2a-4c3d-9a1b-2c3d4e5f6071';
export const EGBLE_CMD_UUID = '6b1e0002-8f2a-4c3d-9a1b-2c3d4e5f6071';
export const EGBLE_STATE_UUID = '6b1e0003-8f2a-4c3d-9a1b-2c3d4e5f6071';
export const EGBLE_SCENE_UUID = '6b1e0004-8f2a-4c3d-9a1b-2c3d4e5f6071';

/** Advertised device name prefix, used to filter scan results. */
export const EGBLE_NAME_PREFIX = 'EGBLE';
