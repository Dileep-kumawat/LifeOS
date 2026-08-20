import {
  colors as rawColors,
  spacing as rawSpacing,
  radius as rawRadius,
  typography as rawTypography,
  motion as rawMotion
} from "@lifeos/shared";
import { TextStyle, ViewStyle } from "react-native";

export const colors = {
  // Brand
  primary: rawColors.primary,
  primaryActive: rawColors.primaryActive,
  secondary: rawColors.secondary,
  onPrimary: rawColors.onPrimary,

  // Surfaces
  canvas: rawColors.canvas,
  canvasSoft: rawColors.canvasSoft,
  surface: rawColors.surface,

  // Hairlines & Borders
  hairline: rawColors.hairline,
  inputBorder: rawColors.inputBorder,

  // Text
  ink: rawColors.ink,
  inkSecondary: rawColors.inkSecondary,
  inkMuted: rawColors.inkMuted,
  inkFaint: rawColors.inkFaint,

  // Decorative Stickers
  accentSky: rawColors.accentSky,
  accentPurple: rawColors.accentPurple,
  accentPurpleDeep: rawColors.accentPurpleDeep,
  accentPink: rawColors.accentPink,
  accentOrange: rawColors.accentOrange,
  accentOrangeDeep: rawColors.accentOrangeDeep,
  accentTeal: rawColors.accentTeal,
  accentGreen: rawColors.accentGreen,
  accentBrown: rawColors.accentBrown,

  // Status
  success: rawColors.success,
  error: rawColors.error,
  warning: rawColors.warning,
  info: rawColors.info
} as const;

export const spacing = {
  xxs: rawSpacing.xxs, // 4
  xs: rawSpacing.xs, // 8
  sm: rawSpacing.sm, // 12
  md: rawSpacing.md, // 16
  lg: rawSpacing.lg, // 24
  xl: rawSpacing.xl, // 28
  xxl: rawSpacing.xxl // 32
} as const;

export const radius = {
  xs: rawRadius.xs, // 4
  sm: rawRadius.sm, // 5
  md: rawRadius.md, // 8
  lg: rawRadius.lg, // 12
  xl: rawRadius.xl, // 16
  full: rawRadius.full // 9999
} as const;

export const type = {
  display1: {
    fontSize: rawTypography.display1.fontSize,
    fontWeight: rawTypography.display1.fontWeight,
    lineHeight: rawTypography.display1.lineHeight,
    letterSpacing: rawTypography.display1.letterSpacing,
    color: colors.ink
  },
  display2: {
    fontSize: rawTypography.display2.fontSize,
    fontWeight: rawTypography.display2.fontWeight,
    lineHeight: rawTypography.display2.lineHeight,
    letterSpacing: rawTypography.display2.letterSpacing,
    color: colors.ink
  },
  heading1: {
    fontSize: rawTypography.heading1.fontSize,
    fontWeight: rawTypography.heading1.fontWeight,
    lineHeight: rawTypography.heading1.lineHeight,
    letterSpacing: rawTypography.heading1.letterSpacing,
    color: colors.ink
  },
  heading2: {
    fontSize: rawTypography.heading2.fontSize,
    fontWeight: rawTypography.heading2.fontWeight,
    lineHeight: rawTypography.heading2.lineHeight,
    letterSpacing: rawTypography.heading2.letterSpacing,
    color: colors.ink
  },
  heading3: {
    fontSize: rawTypography.heading3.fontSize,
    fontWeight: rawTypography.heading3.fontWeight,
    lineHeight: rawTypography.heading3.lineHeight,
    letterSpacing: rawTypography.heading3.letterSpacing,
    color: colors.ink
  },
  title: {
    fontSize: rawTypography.title.fontSize,
    fontWeight: rawTypography.title.fontWeight,
    lineHeight: rawTypography.title.lineHeight,
    letterSpacing: rawTypography.title.letterSpacing,
    color: colors.ink
  },
  bodyMd: {
    fontSize: rawTypography.bodyMd.fontSize,
    fontWeight: rawTypography.bodyMd.fontWeight,
    lineHeight: rawTypography.bodyMd.lineHeight,
    letterSpacing: rawTypography.bodyMd.letterSpacing,
    color: colors.inkSecondary
  },
  bodySm: {
    fontSize: rawTypography.bodySm.fontSize,
    fontWeight: rawTypography.bodySm.fontWeight,
    lineHeight: rawTypography.bodySm.lineHeight,
    letterSpacing: rawTypography.bodySm.letterSpacing,
    color: colors.inkSecondary
  },
  button: {
    fontSize: rawTypography.button.fontSize,
    fontWeight: rawTypography.button.fontWeight,
    lineHeight: rawTypography.button.lineHeight,
    letterSpacing: rawTypography.button.letterSpacing,
    color: colors.onPrimary
  },
  caption: {
    fontSize: rawTypography.caption.fontSize,
    fontWeight: rawTypography.caption.fontWeight,
    lineHeight: rawTypography.caption.lineHeight,
    letterSpacing: rawTypography.caption.letterSpacing,
    color: colors.inkMuted
  },
  eyebrow: {
    fontSize: rawTypography.eyebrow.fontSize,
    fontWeight: rawTypography.eyebrow.fontWeight,
    lineHeight: rawTypography.eyebrow.lineHeight,
    letterSpacing: rawTypography.eyebrow.letterSpacing,
    color: colors.primary
  }
} as const satisfies Record<string, TextStyle>;

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  } as ViewStyle,
  raised: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2
  } as ViewStyle,
  overlay: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 5
  } as ViewStyle
} as const;

export const motion = rawMotion;
export const typography = type;
