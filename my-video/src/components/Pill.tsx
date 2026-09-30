import React from "react";
import { theme } from "../theme";

export interface PillProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "primary" | "outline" | "ghost" | "night" | "active";
  size?: "sm" | "md" | "lg";
  style?: React.CSSProperties;
}

/**
 * LifeOS Pill component:
 * - 9999px border radius (full pill)
 * - Used for action buttons, tabs, quick-add pills, and filters
 */
export const Pill: React.FC<PillProps> = ({
  children,
  icon,
  variant = "outline",
  size = "md",
  style,
}) => {
  const isPrimary = variant === "primary" || variant === "active";
  const isNight = variant === "night";

  const getBg = () => {
    if (isPrimary) return theme.colors.primary;
    if (isNight) return "rgba(255, 255, 255, 0.15)";
    if (variant === "ghost") return "transparent";
    return theme.colors.surface;
  };

  const getColor = () => {
    if (isPrimary || isNight) return "#ffffff";
    return theme.colors.inkSecondary;
  };

  const getBorder = () => {
    if (isPrimary) return "1px solid transparent";
    if (isNight) return "1px solid rgba(255, 255, 255, 0.25)";
    if (variant === "ghost") return "1px solid transparent";
    return `1px solid ${theme.colors.hairline}`;
  };

  const getPadding = () => {
    if (size === "sm") return "4px 10px";
    if (size === "lg") return "10px 20px";
    return "6px 14px";
  };

  const getFontSize = () => {
    if (size === "sm") return 13;
    if (size === "lg") return 16;
    return 14;
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: theme.radii.full,
        backgroundColor: getBg(),
        color: getColor(),
        border: getBorder(),
        padding: getPadding(),
        fontSize: getFontSize(),
        fontWeight: 500,
        lineHeight: "18px",
        fontFamily: theme.fontFamily,
        boxShadow:
          variant === "primary" ? "0 2px 8px rgba(0, 117, 222, 0.25)" : "none",
        userSelect: "none",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {icon && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </span>
      )}
      <span>{children}</span>
    </div>
  );
};
