/**
 * EGBLE - pattern model
 *
 * Mirrors the firmware's Pattern.h. The pattern type names and field names here
 * match the JSON command schema in docs/protocol.md exactly, so the app can
 * build command packets without any translation layer.
 */

export type PatternType =
  | 'OFF'
  | 'SOLID'
  | 'BLINK'
  | 'FADE_PULSE'
  | 'SOS'
  | 'TURN_SIGNAL'
  | 'SEQUENCE'
  | 'FLAME';

export const PATTERN_TYPES: PatternType[] = [
  'OFF',
  'SOLID',
  'BLINK',
  'FADE_PULSE',
  'SOS',
  'TURN_SIGNAL',
  'SEQUENCE',
  'FLAME',
];

/** All timing is milliseconds. bri is a perceptual level 0..255. */
export interface PatternConfig {
  type: PatternType;
  bri: number;
  onMs: number;
  offMs: number;
  fadeInMs: number;
  holdMs: number;
  fadeOutMs: number;
  gapMs: number;
  stepMs: number;
  overlapMs: number;
}

export const DEFAULT_PATTERN: PatternConfig = {
  type: 'OFF',
  bri: 255,
  onMs: 200,
  offMs: 200,
  fadeInMs: 600,
  holdMs: 300,
  fadeOutMs: 900,
  gapMs: 400,
  stepMs: 250,
  overlapMs: 0,
};

/** Which config fields each pattern type actually uses, for the editor UI. */
export const PATTERN_FIELDS: Record<PatternType, (keyof PatternConfig)[]> = {
  OFF: [],
  SOLID: ['bri'],
  BLINK: ['bri', 'onMs', 'offMs'],
  FADE_PULSE: ['bri', 'fadeInMs', 'holdMs', 'fadeOutMs', 'gapMs'],
  SOS: ['bri', 'onMs'],
  TURN_SIGNAL: ['bri', 'onMs', 'offMs'],
  SEQUENCE: ['bri', 'stepMs', 'overlapMs'],
  FLAME: ['bri', 'onMs'],
};

/** Human labels for the editor sliders. */
export const FIELD_LABELS: Partial<Record<keyof PatternConfig, string>> = {
  bri: 'Brightness',
  onMs: 'On time',
  offMs: 'Off time',
  fadeInMs: 'Fade in',
  holdMs: 'Hold',
  fadeOutMs: 'Fade out',
  gapMs: 'Gap',
  stepMs: 'Step time',
  overlapMs: 'Overlap',
};

/** Slider ranges per field: [min, max, step]. */
export const FIELD_RANGES: Partial<Record<keyof PatternConfig, [number, number, number]>> = {
  bri: [0, 255, 1],
  onMs: [20, 2000, 10],
  offMs: [20, 2000, 10],
  fadeInMs: [0, 3000, 50],
  holdMs: [0, 3000, 50],
  fadeOutMs: [0, 3000, 50],
  gapMs: [0, 3000, 50],
  stepMs: [50, 1000, 10],
  overlapMs: [0, 1000, 10],
};

export const BUILTIN_SCENES = [
  'Bike Vest',
  'Retail Sequence',
  'SOS',
  'All On',
  'All Off',
];
