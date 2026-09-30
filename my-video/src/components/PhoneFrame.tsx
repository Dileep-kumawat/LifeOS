import React from "react";
import { theme } from "../theme";

export interface PhoneFrameProps {
  children?: React.ReactNode;
  width?: number;
  height?: number;
  top?: number | string;
  left?: number | string;
  style?: React.CSSProperties;
  screenStyle?: React.CSSProperties;
}

/**
 * PhoneFrame component:
 * - Generic Android-style frame (strictly no brand logos)
 * - 40px outer radius, sleek 10px bezel
 * - Minimal center punch-hole camera
 * - Bottom Android navigation gesture bar
 * - Level 3 shadow
 */
export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  children,
  width = 390,
  height = 780,
  top = 210,
  left = "50%",
  style,
  screenStyle,
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
        borderRadius: 44,
        backgroundColor: "#1c1c1e",
        padding: 10,
        boxShadow: "0 18px 45px rgba(0, 0, 0, 0.22), 0 2px 6px rgba(0,0,0,0.1)",
        border: "1px solid #333336",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        zIndex: 20,
        ...style,
      }}
    >
      {/* Screen container */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 34,
          backgroundColor: theme.colors.canvasSoft,
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          ...screenStyle,
        }}
      >
        {/* Top Status Bar with Android Camera Punch-Hole */}
        <div
          style={{
            height: 32,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: 20,
            paddingRight: 20,
            fontSize: 12,
            fontWeight: 600,
            color: theme.colors.inkSecondary,
            flexShrink: 0,
            zIndex: 30,
            userSelect: "none",
          }}
        >
          <span>9:41</span>

          {/* Centered Android Punch Hole Camera */}
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "#0d0d0f",
              border: "1px solid #222",
            }}
          />

          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <span style={{ fontSize: 10 }}>5G</span>
            <div
              style={{
                width: 16,
                height: 9,
                borderRadius: 2,
                border: "1.5px solid currentColor",
                padding: 1,
                display: "flex",
              }}
            >
              <div
                style={{
                  width: "70%",
                  height: "100%",
                  backgroundColor: "currentColor",
                  borderRadius: 1,
                }}
              />
            </div>
          </div>
        </div>

        {/* Screen Content Body */}
        <div
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </div>

        {/* Android Gesture Bar */}
        <div
          style={{
            height: 20,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            zIndex: 30,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 72,
              height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(0,0,0,0.25)",
            }}
          />
        </div>
      </div>
    </div>
  );
};
