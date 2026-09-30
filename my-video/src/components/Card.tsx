import React from "react";
import { theme } from "../theme";

export interface CardProps {
  children?: React.ReactNode;
  variant?: "surface" | "night" | "flat" | "raised";
  padding?: number | string;
  borderRadius?: number;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * LifeOS UI Card component:
 * - 12px standard radius
 * - 1px hairline border
 * - Level 1 shadow standard
 * - Supports "night" variant (#213183 deep indigo)
 */
export const Card: React.FC<CardProps> = ({
  children,
  variant = "surface",
  padding = 16,
  borderRadius = theme.radii.lg,
  style,
  className,
}) => {
  const isNight = variant === "night";

  const getBackgroundColor = () => {
    if (isNight) return theme.colors.secondary;
    return theme.colors.surface;
  };

  const getShadow = () => {
    if (variant === "flat") return "none";
    if (variant === "raised") return theme.shadows.level2;
    if (isNight) return "0 4px 20px rgba(33, 49, 131, 0.25)";
    return theme.shadows.level1;
  };

  const getBorder = () => {
    if (isNight) return "1px solid rgba(255, 255, 255, 0.12)";
    return `1px solid ${theme.colors.hairline}`;
  };

  return (
    <div
      className={className}
      style={{
        backgroundColor: getBackgroundColor(),
        borderRadius,
        border: getBorder(),
        boxShadow: getShadow(),
        padding,
        color: isNight ? "#ffffff" : theme.colors.ink,
        fontFamily: theme.fontFamily,
        position: "relative",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
