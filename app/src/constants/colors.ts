// EGBLE - design tokens
// Carried over from the MOOD app so the two feel like a family. The accent is
// shifted toward EL cyan since that is the product's signature glow.

export const Colors = {
  bg: '#08090f',
  bg2: '#0e1019',
  bg3: '#141620',
  bg4: '#1a1d2a',
  border: 'rgba(255,255,255,0.065)',
  text: '#ddd8cf',
  muted: '#42465a',
  accent: '#38d6c8',

  success: '#5ddb8a',
  danger: '#e05050',
  warn: '#f59e0b',

  // Per-pattern accent colors for chips and channel cards.
  pattern: {
    OFF: '#4a5568',
    SOLID: '#38d6c8',
    BLINK: '#3b8fd4',
    FADE_PULSE: '#8b5cf6',
    SOS: '#e05050',
    TURN_SIGNAL: '#f59e0b',
    SEQUENCE: '#e8458b',
    FLAME: '#ff6b35',
  },
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;
