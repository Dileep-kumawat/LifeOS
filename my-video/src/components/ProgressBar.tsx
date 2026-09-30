import React from "react";
import { theme } from "../theme";

export interface ProgressBarProps {
  progress: number; // 0 to 100 or 0 to 1
  height?: number;
  trackColor?: string;
  color?: string;
  borderRadius?: number;
  style?: React.CSSProperties;
}

/**
 * ProgressBar component:
 * - Animated purely via numerical progress prop (no CSS transitions)
 * - Rounded track and fill
 * - Default LifeOS blue accent
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 6,
  trackColor = theme.colors.hairline,
  color = theme.colors.primary,
  borderRadius = 9999,
  style,
}) => {
  // Normalize progress to percentage (0 - 100)
  const normalized = Math.min(
    100,
    Math.max(0, progress <= 1 && progress > 0 ? progress * 100 : progress)
  );

  return (
    <div
      style={{
        width: "100%",
        height,
        backgroundColor: trackColor,
        borderRadius,
        overflow: "hidden",
        position: "relative",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div
        style={{
          width: `${normalized}%`,
          height: "100%",
          backgroundColor: color,
          borderRadius,
        }}
      />
    </div>
  );
};
