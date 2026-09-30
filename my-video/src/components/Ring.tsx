import React from "react";
import { theme } from "../theme";

export interface RingProps {
  progress: number; // 0 to 1 or 0 to 100
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Ring component:
 * - Circular SVG progress dial for Pomodoro timer and completion metrics
 * - Clockwise fill starting at top (12 o'clock)
 */
export const Ring: React.FC<RingProps> = ({
  progress,
  size = 200,
  strokeWidth = 10,
  color = theme.colors.primary,
  trackColor = theme.colors.hairline,
  children,
  style,
}) => {
  // Normalize progress to [0, 1]
  const normalized = Math.min(
    1,
    Math.max(0, progress > 1 ? progress / 100 : progress)
  );

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - normalized);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      <svg
        width={size}
        height={size}
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
        }}
      >
        {/* Background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Active progress stroke */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>

      {/* Centered content */}
      {children && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};
