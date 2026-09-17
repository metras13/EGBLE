/**
 * Ware - Vibe presets
 *
 * The Vibe tab is the "pick a look, don't build a pattern" layer. Each Vibe is
 * a one-tap bundle of pattern + timing with a friendly name, an icon, and a
 * one-line blurb. build() takes an already power-scaled brightness and a 0..100
 * speed and returns a PatternConfig broadcast to every channel, so Vibes map
 * straight onto the pattern types the firmware already runs - no new firmware.
 *
 * Adding a Vibe here makes it appear in the gallery automatically.
 */

import { PatternConfig, DEFAULT_PATTERN } from './patterns';
import { Colors } from './colors';

export type VibeKey =
  | 'steady'
  | 'breathe'
  | 'heartbeat'
  | 'campfire'
  | 'party'
  | 'cadence'
  | 'beacon'
  | 'music'
  | 'sos';

export interface Vibe {
  key: VibeKey;
  label: string;
  icon: string; // emoji shown on the card
  blurb: string; // one-line "what it does"
  color: string;
  beta?: boolean; // shows a small BETA tag
  usesSpeed: boolean; // whether the Speed slider changes this vibe
  build: (bri: number, speed: number) => PatternConfig;
}

// Map a 0..100 speed slider onto a timing range. Higher speed = livelier.
function lerp(slow: number, fast: number, speed: number): number {
  return Math.round(slow + (fast - slow) * (speed / 100));
}

export const VIBES: Vibe[] = [
  {
    key: 'steady',
    label: 'Steady',
    icon: '💡',
    blurb: 'Solid, always on',
    color: Colors.pattern.SOLID,
    usesSpeed: false,
    build: (bri) => ({ ...DEFAULT_PATTERN, type: 'SOLID', bri }),
  },
  {
    key: 'breathe',
    label: 'Breathe',
    icon: '🫧',
    blurb: 'Slow calm fade in and out',
    color: Colors.pattern.FADE_PULSE,
    usesSpeed: true,
    build: (bri, speed) => {
      const d = lerp(3200, 700, speed);
      return { ...DEFAULT_PATTERN, type: 'FADE_PULSE', bri, fadeInMs: d, holdMs: 0, fadeOutMs: d, gapMs: 200 };
    },
  },
  {
    key: 'heartbeat',
    label: 'Heartbeat',
    icon: '💓',
    blurb: 'Soft thump like a pulse',
    color: Colors.pattern.SEQUENCE,
    usesSpeed: true,
    build: (bri, speed) => {
      const gap = lerp(900, 260, speed);
      return { ...DEFAULT_PATTERN, type: 'FADE_PULSE', bri, fadeInMs: 90, holdMs: 70, fadeOutMs: 240, gapMs: gap };
    },
  },
  {
    key: 'campfire',
    label: 'Campfire',
    icon: '🔥',
    blurb: 'Warm flicker',
    color: Colors.pattern.FLAME,
    usesSpeed: true,
    build: (bri, speed) => ({ ...DEFAULT_PATTERN, type: 'FLAME', bri, onMs: lerp(180, 40, speed) }),
  },
  {
    key: 'party',
    label: 'Party',
    icon: '🪩',
    blurb: 'Fast strobe for the floor',
    color: Colors.pattern.BLINK,
    usesSpeed: true,
    build: (bri, speed) => {
      const r = lerp(220, 45, speed);
      return { ...DEFAULT_PATTERN, type: 'BLINK', bri, onMs: r, offMs: r };
    },
  },
  {
    key: 'cadence',
    label: 'Cadence',
    icon: '👟',
    blurb: 'Blinks to your running step',
    color: Colors.pattern.TURN_SIGNAL,
    usesSpeed: true,
    build: (bri, speed) => {
      // ~150..190 steps/min mapped to speed; period = 60000 / spm.
      const spm = lerp(150, 190, speed);
      const period = Math.round(60000 / spm);
      const on = Math.round(period * 0.35);
      return { ...DEFAULT_PATTERN, type: 'BLINK', bri, onMs: on, offMs: period - on };
    },
  },
  {
    key: 'beacon',
    label: 'Beacon',
    icon: '🛟',
    blurb: 'Bright flash, easy to spot',
    color: Colors.accent,
    usesSpeed: true,
    build: (bri, speed) => {
      const dark = lerp(1800, 700, speed);
      return { ...DEFAULT_PATTERN, type: 'BLINK', bri, onMs: 130, offMs: dark };
    },
  },
  {
    key: 'music',
    label: 'Music',
    icon: '🎵',
    blurb: 'Pulses to a beat',
    color: Colors.pattern.SEQUENCE,
    beta: true,
    usesSpeed: true,
    // Beta: a lively self-driving pulse. A later build wires the phone mic so it
    // reacts to real sound (needs an audio dependency, so it lands separately).
    build: (bri, speed) => {
      const beat = lerp(560, 180, speed); // ~107..333 bpm feel
      return { ...DEFAULT_PATTERN, type: 'FADE_PULSE', bri, fadeInMs: 40, holdMs: 40, fadeOutMs: beat, gapMs: 0 };
    },
  },
  {
    key: 'sos',
    label: 'SOS',
    icon: '🆘',
    blurb: 'Morse distress signal',
    color: Colors.pattern.SOS,
    usesSpeed: false,
    build: (bri) => ({ ...DEFAULT_PATTERN, type: 'SOS', bri }),
  },
];
