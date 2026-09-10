/**
 * EGBLE - command builders and state parsing
 *
 * Pure functions with no BLE or React dependency, so the wire format can be
 * unit-tested in isolation. Every builder returns a JSON string ready to write
 * to the command (or scene) characteristic. Shapes match docs/protocol.md.
 */

import { PatternConfig, PatternType } from '../constants/patterns';

// ---- Commands ----

/** Build a pattern command for a single channel. */
export function cmdPatternChannel(ch: number, cfg: PatternConfig): string {
  return JSON.stringify({ cmd: 'pattern', ch, ...compactPattern(cfg) });
}

/** Build a pattern command for a whole group. */
export function cmdPatternGroup(gid: number, cfg: PatternConfig): string {
  return JSON.stringify({ cmd: 'pattern', grp: gid, ...compactPattern(cfg) });
}

/** Build a pattern command targeting all channels. */
export function cmdPatternAll(cfg: PatternConfig): string {
  return JSON.stringify({ cmd: 'pattern', all: true, ...compactPattern(cfg) });
}

export function cmdEnable(ch: number, on: boolean): string {
  return JSON.stringify({ cmd: 'enable', ch, on });
}

export function cmdGroup(ch: number, gid: number): string {
  return JSON.stringify({ cmd: 'group', ch, gid });
}

export function cmdScale(ch: number, pct: number): string {
  return JSON.stringify({ cmd: 'scale', ch, pct: clamp(pct, 0, 100) });
}

export type TriggerAction = 'left' | 'right' | 'sos' | 'stop';

export function cmdTrigger(action: TriggerAction): string {
  return JSON.stringify({ cmd: 'trigger', action });
}

export function cmdGet(): string {
  return JSON.stringify({ cmd: 'get' });
}

// ---- Scene commands ----

export function cmdSceneSave(slot: number, name: string): string {
  return JSON.stringify({ cmd: 'scene', action: 'save', slot, name });
}

export function cmdSceneLoad(slot: number): string {
  return JSON.stringify({ cmd: 'scene', action: 'load', slot });
}

export function cmdSceneDelete(slot: number): string {
  return JSON.stringify({ cmd: 'scene', action: 'delete', slot });
}

export function cmdSceneRecall(name: string): string {
  return JSON.stringify({ cmd: 'scene', action: 'recall', name });
}

// Only send the fields the given pattern type needs, plus its type. This keeps
// packets small and avoids overwriting firmware defaults the app did not set.
function compactPattern(cfg: PatternConfig): Record<string, unknown> {
  const out: Record<string, unknown> = { type: cfg.type };
  const include = (k: keyof PatternConfig) => {
    out[k] = cfg[k];
  };
  switch (cfg.type) {
    case 'SOLID':
      include('bri');
      break;
    case 'BLINK':
    case 'TURN_SIGNAL':
      include('bri');
      include('onMs');
      include('offMs');
      break;
    case 'FADE_PULSE':
      include('bri');
      include('fadeInMs');
      include('holdMs');
      include('fadeOutMs');
      include('gapMs');
      break;
    case 'SOS':
      include('bri');
      include('onMs');
      break;
    case 'SEQUENCE':
      include('bri');
      include('stepMs');
      include('overlapMs');
      break;
    case 'OFF':
    default:
      break;
  }
  return out;
}

// ---- State parsing ----

export interface ChannelState {
  enabled: boolean;
  groupId: number;
  pattern: PatternType;
  bri: number;
  scale: number;
  level: number;
}

/** Battery of the mounted swap cell, as reported by the inverter's VBAT sense. */
export interface BatteryState {
  present: boolean;   // did the device report a battery reading at all
  pct: number;        // 0..100 state of charge
  charging: boolean;  // on the charge pad / pigtail
}

export const ABSENT_BATTERY: BatteryState = { present: false, pct: 0, charging: false };

export type BatteryTier = 'good' | 'low' | 'critical';

/** Map a state-of-charge to the white / orange / red tier used everywhere. */
export function batteryTier(pct: number): BatteryTier {
  if (pct < 15) return 'critical';
  if (pct < 40) return 'low';
  return 'good';
}

export interface DeviceState {
  version: string;
  channels: ChannelState[];
  battery: BatteryState;
}

/** Parse a state notification payload. Returns null if it does not parse. */
export function parseState(json: string): DeviceState | null {
  try {
    const o = JSON.parse(json);
    if (!o || !Array.isArray(o.ch)) return null;
    // Battery is optional: older firmware / boards without VBAT sense omit `bat`.
    const bat = o.bat && typeof o.bat === 'object'
      ? { present: true, pct: clamp(Number(o.bat.p) || 0, 0, 100), charging: o.bat.ch === 1 || o.bat.ch === true }
      : ABSENT_BATTERY;
    return {
      version: typeof o.v === 'string' ? o.v : '',
      battery: bat,
      channels: o.ch.map((c: any) => ({
        enabled: c.e === 1 || c.e === true,
        groupId: Number(c.g) || 0,
        pattern: (c.p as PatternType) ?? 'OFF',
        bri: Number(c.bri) || 0,
        scale: typeof c.sc === 'number' ? c.sc : 100,
        level: Number(c.lvl) || 0,
      })),
    };
  } catch {
    return null;
  }
}

export interface SceneList {
  builtins: string[];
  slots: { slot: number; name: string | null }[];
}

/** Parse the scene characteristic read payload. */
export function parseScenes(json: string): SceneList | null {
  try {
    const o = JSON.parse(json);
    return {
      builtins: Array.isArray(o.builtin) ? o.builtin : [],
      slots: Array.isArray(o.slots)
        ? o.slots.map((s: any) => ({ slot: Number(s.slot), name: s.name ?? null }))
        : [],
    };
  } catch {
    return null;
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}
