import React from "react";
import { theme } from "../theme";

export type BadgeColor =
  | "blue"
  | "sky"
  | "purple"
  | "pink"
  | "orange"
  | "teal"
  | "green"
  | "gray"
  | "night";

export interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  dot?: boolean;
  dotColor?: string;
  size?: "sm" | "md";
  style?: React.CSSProperties;
}

const colorStyles: Record<
  BadgeColor,
  { bg: string; text: string; border?: string; dot: string }
> = {
  blue: {
    bg: "rgba(0, 117, 222, 0.10)",
    text: "#0075de",
    border: "rgba(0, 117, 222, 0.20)",
    dot: "#0075de",
  },
  sky: {
    bg: "rgba(98, 174, 240, 0.15)",
    text: "#0a6eb4",
    border: "rgba(98, 174, 240, 0.30)",
    dot: "#62aef0",
  },
  purple: {
    bg: "rgba(214, 182, 246, 0.25)",
    text: "#5b2696",
    border: "rgba(214, 182, 246, 0.40)",
    dot: "#8b4fcf",
  },
  pink: {
    bg: "rgba(255, 100, 200, 0.12)",
    text: "#b8127f",
    border: "rgba(255, 100, 200, 0.25)",
    dot: "#ff64c8",
  },
  orange: {
    bg: "rgba(221, 91, 0, 0.10)",
    text: "#dd5b00",
    border: "rgba(221, 91, 0, 0.25)",
    dot: "#dd5b00",
  },
  teal: {
    bg: "rgba(42, 157, 153, 0.12)",
    text: "#156a67",
    border: "rgba(42, 157, 153, 0.25)",
    dot: "#2a9d99",
  },
  green: {
    bg: "rgba(26, 174, 57, 0.12)",
    text: "#158b2e",
    border: "rgba(26, 174, 57, 0.25)",
    dot: "#1aae39",
  },
  gray: {
    bg: "#efeeea",
    text: "#524f4a",
    border: "#e2dfd9",
    dot: "#8b857d",
  },
  night: {
    bg: "rgba(255, 255, 255, 0.15)",
    text: "#ffffff",
    border: "rgba(255, 255, 255, 0.25)",
    dot: "#62aef0",
  },
};

/**
 * LifeOS Badge component for status tags, countdowns, priorities, and category pills
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  color = "blue",
  dot = false,
  dotColor,
  size = "md",
  style,
}) => {
  const conf = colorStyles[color] || colorStyles.blue;
  const isSm = size === "sm";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        backgroundColor: conf.bg,
        color: conf.text,
        border: conf.border ? `1px solid ${conf.border}` : "none",
        borderRadius: theme.radii.xs,
        padding: isSm ? "2px 6px" : "3px 8px",
        fontSize: isSm ? 11 : 12,
        fontWeight: 600,
        lineHeight: "14px",
        letterSpacing: "0.1px",
        fontFamily: theme.fontFamily,
        boxSizing: "border-box",
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: dotColor ?? conf.dot,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </div>
  );
};
