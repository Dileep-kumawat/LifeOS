import React from "react";
import { theme } from "../theme";

export interface BrowserWindowProps {
  children?: React.ReactNode;
  width?: number | string;
  height?: number | string;
  top?: number | string;
  left?: number | string;
  title?: string;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
}

/**
 * BrowserWindow component:
 * - 12px border radius
 * - 1px hairline border (#e6e6e6)
 * - Level 3 shadow (0 8px 24px rgba(0,0,0,0.18))
 * - No URL text
 * - Clean title bar with 3 macOS/Swiss dots
 * - Defaults to layout band y: 200 to 1000 (height 800px)
 */
export const BrowserWindow: React.FC<BrowserWindowProps> = ({
  children,
  width = 1520,
  height = 800,
  top = 200,
  left = "50%",
  title,
  style,
  bodyStyle,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        transform: left === "50%" ? "translateX(-50%)" : undefined,
        width,
        height,
        borderRadius: theme.radii.lg,
        border: `1px solid ${theme.colors.hairline}`,
        boxShadow: theme.shadows.level3,
        backgroundColor: theme.colors.surface,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: theme.fontFamily,
        ...style,
      }}
    >
      {/* Title Bar (Strictly NO URL text) */}
      <div
        style={{
          height: 40,
          backgroundColor: "#faf9f8",
          borderBottom: `1px solid ${theme.colors.hairline}`,
          display: "flex",
          alignItems: "center",
          paddingLeft: 16,
          paddingRight: 16,
          position: "relative",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        {/* Window control dots */}
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "#ff5f56",
            }}
          />
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "#ffbd2e",
            }}
          />
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "#27c93f",
            }}
          />
        </div>

        {/* Optional centered title */}
        {title && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 500,
              color: theme.colors.inkMuted,
              pointerEvents: "none",
            }}
          >
            {title}
          </div>
        )}
      </div>

      {/* Main Window Surface */}
      <div
        style={{
          flex: 1,
          backgroundColor: theme.colors.surface,
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          ...bodyStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
};
