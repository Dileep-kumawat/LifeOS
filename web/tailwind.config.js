import { colors, spacing, radius } from "@lifeos/shared";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "./.storybook/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: colors.primary,
          "primary-active": colors.primaryActive,
          secondary: colors.secondary
        },
        canvas: colors.canvas,
        "canvas-soft": colors.canvasSoft,
        surface: colors.surface,
        hairline: colors.hairline,
        ink: {
          DEFAULT: colors.ink,
          secondary: colors.inkSecondary,
          muted: colors.inkMuted,
          faint: colors.inkFaint
        },
        sticker: {
          sky: colors.accentSky,
          purple: colors.accentPurple,
          "purple-deep": colors.accentPurpleDeep,
          pink: colors.accentPink,
          orange: colors.accentOrange,
          "orange-deep": colors.accentOrangeDeep,
          teal: colors.accentTeal,
          green: colors.accentGreen,
          brown: colors.accentBrown
        }
      },
      spacing: {
        xxs: `${spacing.xxs}px`,
        xs: `${spacing.xs}px`,
        sm: `${spacing.sm}px`,
        md: `${spacing.md}px`,
        lg: `${spacing.lg}px`,
        xl: `${spacing.xl}px`,
        xxl: `${spacing.xxl}px`
      },
      borderRadius: {
        xs: `${radius.xs}px`,
        sm: `${radius.sm}px`,
        md: `${radius.md}px`,
        lg: `${radius.lg}px`,
        xl: `${radius.xl}px`
      }
    }
  },
  plugins: []
};
