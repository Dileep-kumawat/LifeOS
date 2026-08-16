/**
 * LifeOS Shared Design Tokens
 * Single source of truth extracted from DESIGN.md for both Web and Mobile.
 */

export const colors = {
  // Brand & Accent
  primary: "#0075de",
  primaryActive: "#005bab",
  secondary: "#213183",
  onPrimary: "#ffffff",

  // Surface & Canvas
  canvas: "#ffffff",
  canvasSoft: "#f6f5f4",
  surface: "#ffffff",

  // Hairline & Borders
  hairline: "#e6e6e6",
  inputBorder: "#dddddd",

  // Ink & Typography
  ink: "#000000",
  inkSecondary: "#31302e",
  inkMuted: "#615d59",
  inkFaint: "#a39e98",

  // Decorative Sticker Palette
  accentSky: "#62aef0",
  accentPurple: "#d6b6f6",
  accentPurpleDeep: "#391c57",
  accentPink: "#ff64c8",
  accentOrange: "#dd5b00",
  accentOrangeDeep: "#793400",
  accentTeal: "#2a9d99",
  accentGreen: "#1aae39",
  accentBrown: "#523410",

  // Status & Feedback
  success: "#1aae39",
  error: "#dd5b00",
  warning: "#dd5b00",
  info: "#0075de"
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 28,
  xxl: 32
} as const;

export const radius = {
  xs: 4,
  sm: 5,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999
} as const;

export const typography = {
  display1: {
    fontSize: 64,
    fontWeight: "700" as const,
    lineHeight: 64,
    letterSpacing: -2.125
  },
  display2: {
    fontSize: 54,
    fontWeight: "700" as const,
    lineHeight: 56.16,
    letterSpacing: -1.875
  },
  heading1: {
    fontSize: 40,
    fontWeight: "700" as const,
    lineHeight: 44,
    letterSpacing: -1
  },
  heading2: {
    fontSize: 26,
    fontWeight: "700" as const,
    lineHeight: 31.98,
    letterSpacing: -0.625
  },
  heading3: {
    fontSize: 22,
    fontWeight: "700" as const,
    lineHeight: 27.94,
    letterSpacing: -0.25
  },
  title: {
    fontSize: 20,
    fontWeight: "600" as const,
    lineHeight: 28,
    letterSpacing: -0.125
  },
  bodyMd: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
    letterSpacing: 0
  },
  bodySm: {
    fontSize: 15,
    fontWeight: "400" as const,
    lineHeight: 19.95,
    letterSpacing: 0
  },
  button: {
    fontSize: 16,
    fontWeight: "500" as const,
    lineHeight: 24,
    letterSpacing: 0
  },
  caption: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20.02,
    letterSpacing: 0
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "600" as const,
    lineHeight: 15.96,
    letterSpacing: 0.125
  }
} as const;

export const shadows = {
  card: "0 1px 2px rgba(0, 0, 0, 0.05)",
  raised: "0 4px 12px rgba(0, 0, 0, 0.10)",
  overlay: "0 8px 24px rgba(0, 0, 0, 0.18)"
} as const;

export const motion = {
  fast: 150,
  base: 250,
  slow: 400
} as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Typography = typeof typography;
export type Shadows = typeof shadows;
export type Motion = typeof motion;
