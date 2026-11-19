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

/** Advertised device name prefix, used to filter scan results.
 *  The controller firmware advertises as "Ware" (see
 *  firmware/egble-controller/egble-controller.ino), matching the App Store
 *  name "Ware by Ellumiglow" per Apple Guideline 2.3.8. The service-UUID
 *  filter is the primary gate; this prefix is only a fallback. "EGBLE" is kept
 *  as an accepted legacy prefix so controllers on older firmware still pair. */
export const EGBLE_NAME_PREFIX = 'Ware';
export const EGBLE_LEGACY_NAME_PREFIX = 'EGBLE';
