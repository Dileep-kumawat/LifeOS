import { loadFont } from "@remotion/google-fonts/Inter";

const inter = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const theme = {
  fontFamily: inter.fontFamily,

  colors: {
    // Surfaces & Canvas
    canvasSoft: "#f6f5f4",
    surface: "#ffffff",
    canvas: "#ffffff",

    // Primary Brand & Actions
    primary: "#0075de",
    primaryActive: "#005bab",
    onPrimary: "#ffffff",

    // Executive Hero Band
    secondary: "#213183",
    night: "#213183",

    // Borders & Dividers
    hairline: "#e6e6e6",
    inputBorder: "#dddddd",

    // Typography Ink
    ink: "#000000",
    inkSecondary: "#31302e",
    inkMuted: "#615d59",
    inkFaint: "#a39e98",

    // Decorative Sticker Palette (Badges & category dots only, never CTAs)
    sky: "#62aef0",
    purple: "#d6b6f6",
    deepPurple: "#391c57",
    pink: "#ff64c8",
    orange: "#dd5b00",
    deepOrange: "#793400",
    teal: "#2a9d99",
    green: "#1aae39",
    brown: "#523410",

    // Semantic Feedback
    success: "#1aae39",
    warning: "#dd5b00",
    error: "#dd5b00",
    info: "#0075de",
  },

  typography: {
    display1: {
      fontSize: 64,
      lineHeight: "64px",
      letterSpacing: "-2.125px",
      fontWeight: 700,
    },
    display2: {
      fontSize: 54,
      lineHeight: "56px",
      letterSpacing: "-1.875px",
      fontWeight: 700,
    },
    heading1: {
      fontSize: 40,
      lineHeight: "44px",
      letterSpacing: "-1.0px",
      fontWeight: 700,
    },
    heading2: {
      fontSize: 26,
      lineHeight: "32px",
      letterSpacing: "-0.625px",
      fontWeight: 700,
    },
    heading3: {
      fontSize: 22,
      lineHeight: "28px",
      letterSpacing: "-0.25px",
      fontWeight: 700,
    },
    title: {
      fontSize: 20,
      lineHeight: "28px",
      letterSpacing: "-0.125px",
      fontWeight: 600,
    },
    bodyMd: {
      fontSize: 16,
      lineHeight: "24px",
      letterSpacing: "0px",
      fontWeight: 400,
    },
    bodySm: {
      fontSize: 15,
      lineHeight: "20px",
      letterSpacing: "0px",
      fontWeight: 400,
    },
    button: {
      fontSize: 16,
      lineHeight: "24px",
      letterSpacing: "0px",
      fontWeight: 500,
    },
    caption: {
      fontSize: 14,
      lineHeight: "20px",
      letterSpacing: "0px",
      fontWeight: 400,
    },
    eyebrow: {
      fontSize: 12,
      lineHeight: "16px",
      letterSpacing: "0.125px",
      fontWeight: 600,
    },
  },

  radii: {
    xs: 4,
    sm: 5,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },

  shadows: {
    level0: "none",
    level1: "0 1px 2px rgba(0,0,0,0.05)",
    level2: "0 4px 12px rgba(0,0,0,0.10)",
    level3: "0 8px 24px rgba(0,0,0,0.18)",
  },

  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 28,
    xxl: 32,
  },
} as const;

export type Theme = typeof theme;
