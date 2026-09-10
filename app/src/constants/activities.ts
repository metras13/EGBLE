/**
 * Ware - activity presets and power modes
 *
 * The wearer-facing layer. An Activity is a one-tap bundle of pattern + timing
 * tuned for how the light is actually used while worn (a night run, a dog walk,
 * a bike commute). Each build() takes an already power-scaled brightness and
 * returns a PatternConfig applied to every channel, so activities compose with
 * the power modes below.
 *
 * Everything here maps onto pattern types the firmware already runs, so an
 * activity is just a preset - no new firmware needed.
 */

import { PatternConfig, DEFAULT_PATTERN } from './patterns';
import { Colors } from './colors';

export type ActivityKey = 'run' | 'walk' | 'bike' | 'night';

export interface Activity {
  key: ActivityKey;
  label: string;
  emoji: string;
  blurb: string; // one-line "what it does", shown under the tile
  color: string;
  build: (bri: number) => PatternConfig;
}

export const ACTIVITIES: Activity[] = [
  {
    key: 'run',
    label: 'Run',
    emoji: '🏃',
    blurb: 'Breathing pulse - easy for drivers to catch',
    color: Colors.pattern.FADE_PULSE,
    build: (bri) => ({
      ...DEFAULT_PATTERN,
      type: 'FADE_PULSE',
      bri,
      fadeInMs: 700,
      holdMs: 120,
      fadeOutMs: 700,
      gapMs: 120,
    }),
  },
  {
    key: 'walk',
    label: 'Dog walk',
    emoji: '🐕',
    blurb: 'Calm steady glow, low key',
    color: Colors.accent,
    build: (bri) => ({ ...DEFAULT_PATTERN, type: 'SOLID', bri }),
  },
  {
    key: 'bike',
    label: 'Bike',
    emoji: '🚴',
    blurb: 'Bright and steady - pair with turn signals',
    color: Colors.pattern.SOLID,
    build: (bri) => ({ ...DEFAULT_PATTERN, type: 'SOLID', bri }),
  },
  {
    key: 'night',
    label: 'Night',
    emoji: '🌙',
    blurb: 'Attention blink for traffic',
    color: Colors.pattern.BLINK,
    build: (bri) => ({ ...DEFAULT_PATTERN, type: 'BLINK', bri, onMs: 260, offMs: 260 }),
  },
];

export type PowerMode = 'bright' | 'balanced' | 'endurance';

export interface PowerModeInfo {
  key: PowerMode;
  label: string;
  factor: number; // multiplies master brightness to trade output for runtime
  blurb: string;
}

export const POWER_MODES: PowerModeInfo[] = [
  { key: 'bright', label: 'Bright', factor: 1.0, blurb: 'Max output' },
  { key: 'balanced', label: 'Balanced', factor: 0.65, blurb: 'Longer runtime' },
  { key: 'endurance', label: 'Endurance', factor: 0.4, blurb: 'All night' },
];

export function powerFactor(mode: PowerMode): number {
  return (POWER_MODES.find((m) => m.key === mode) ?? POWER_MODES[0]).factor;
}

/** Apply a power mode to a raw 0..255 brightness. */
export function effectiveBrightness(masterBrightness: number, mode: PowerMode): number {
  return Math.max(1, Math.round(masterBrightness * powerFactor(mode)));
}
