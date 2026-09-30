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
 * - Premium flagship smartphone chassis (Natural / Space Black Titanium)
 * - Proportional 54px outer squircle, 42px inner screen radius
 * - Realistic metallic titanium rim with chamfer highlights
 * - Hardware side buttons: Action Button, Volume Up, Volume Down, Side Power
 * - Iconic Dynamic Island with camera lens reflection
 * - Precise status bar with cellular bars, 5G, and battery capsule
 * - Bottom home indicator bar
 * - Multi-layer ambient drop shadow
 */
export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  children,
  width = 430,
  height = 840,
  top = 170,
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
        zIndex: 20,
        ...style,
      }}
    >
      {/* ======================================================== */}
      {/* Hardware Buttons on Outer Sides */}
      {/* ======================================================== */}
      {/* Left: Action Button */}
      <div
        style={{
          position: "absolute",
          left: -3,
          top: 130,
          width: 4,
          height: 30,
          backgroundColor: "#38383c",
          borderRadius: "3px 0 0 3px",
          boxShadow: "-1px 0 2px rgba(0,0,0,0.5)",
        }}
      />
      {/* Left: Volume Up */}
      <div
        style={{
          position: "absolute",
          left: -3,
          top: 176,
          width: 4,
          height: 54,
          backgroundColor: "#38383c",
          borderRadius: "3px 0 0 3px",
          boxShadow: "-1px 0 2px rgba(0,0,0,0.5)",
        }}
      />
      {/* Left: Volume Down */}
      <div
        style={{
          position: "absolute",
          left: -3,
          top: 242,
          width: 4,
          height: 54,
          backgroundColor: "#38383c",
          borderRadius: "3px 0 0 3px",
          boxShadow: "-1px 0 2px rgba(0,0,0,0.5)",
        }}
      />
      {/* Right: Side Power Button */}
      <div
        style={{
          position: "absolute",
          right: -3,
          top: 196,
          width: 4,
          height: 78,
          backgroundColor: "#38383c",
          borderRadius: "0 3px 3px 0",
          boxShadow: "1px 0 2px rgba(0,0,0,0.5)",
        }}
      />

      {/* ======================================================== */}
      {/* Titanium Outer Chassis (Curved metallic bevel) */}
      {/* ======================================================== */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 54,
          background: "linear-gradient(145deg, #444448 0%, #262629 35%, #18181a 100%)",
          padding: 3,
          boxSizing: "border-box",
          boxShadow:
            "0 32px 75px rgba(0, 0, 0, 0.38), 0 12px 28px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.12)",
          display: "flex",
          position: "relative",
        }}
      >
        {/* Inner Deep Black Bezel Ring */}
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 51,
            backgroundColor: "#000000",
            padding: 9,
            boxSizing: "border-box",
            display: "flex",
            position: "relative",
          }}
        >
          {/* Screen Glass Container */}
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 42,
              backgroundColor: theme.colors.canvasSoft,
              overflow: "hidden",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              ...screenStyle,
            }}
          >
            {/* ==================================================== */}
            {/* Top Status Bar with Dynamic Island */}
            {/* ==================================================== */}
            <div
              style={{
                height: 44,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingLeft: 24,
                paddingRight: 24,
                fontSize: 14,
                fontWeight: 600,
                color: theme.colors.ink,
                flexShrink: 0,
                zIndex: 50,
                userSelect: "none",
                position: "relative",
              }}
            >
              {/* Time */}
              <span style={{ letterSpacing: "-0.3px", fontWeight: 700, fontSize: 13.5 }}>
                9:41
              </span>

              {/* Dynamic Island Capsule */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 8,
                  transform: "translateX(-50%)",
                  width: 118,
                  height: 30,
                  borderRadius: 20,
                  backgroundColor: "#000000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingLeft: 12,
                  paddingRight: 12,
                  boxSizing: "border-box",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
                }}
              >
                {/* Left: Camera Lens with optical reflection */}
                <div
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle at 35% 35%, #2a3b5c 0%, #0c1524 60%, #000000 100%)",
                    border: "0.5px solid rgba(255, 255, 255, 0.12)",
                  }}
                />

                {/* Right: TrueDepth Sensor Dot */}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "#0a0a0e",
                  }}
                />
              </div>

              {/* Status Icons: Cellular, 5G, Battery */}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {/* 4 Cellular Signal Bars */}
                <div style={{ display: "flex", gap: 1.5, alignItems: "flex-end", height: 11 }}>
                  <div style={{ width: 2.5, height: 3, backgroundColor: "currentColor", borderRadius: 0.5 }} />
                  <div style={{ width: 2.5, height: 5.5, backgroundColor: "currentColor", borderRadius: 0.5 }} />
                  <div style={{ width: 2.5, height: 8, backgroundColor: "currentColor", borderRadius: 0.5 }} />
                  <div style={{ width: 2.5, height: 11, backgroundColor: "currentColor", borderRadius: 0.5 }} />
                </div>

                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "-0.2px", marginLeft: 1 }}>
                  5G
                </span>

                {/* Battery Capsule */}
                <div style={{ display: "flex", alignItems: "center", marginLeft: 2 }}>
                  <div
                    style={{
                      width: 22,
                      height: 11.5,
                      borderRadius: 3.5,
                      border: "1.5px solid currentColor",
                      padding: 1.5,
                      boxSizing: "border-box",
                      display: "flex",
                    }}
                  >
                    <div
                      style={{
                        width: "82%",
                        height: "100%",
                        backgroundColor: "currentColor",
                        borderRadius: 1.5,
                      }}
                    />
                  </div>
                  {/* Battery Terminal Bump */}
                  <div
                    style={{
                      width: 1.5,
                      height: 4.5,
                      borderRadius: "0 1px 1px 0",
                      backgroundColor: "currentColor",
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

            {/* Bottom Home Indicator */}
            <div
              style={{
                height: 20,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                zIndex: 50,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  width: 132,
                  height: 4.5,
                  borderRadius: 3,
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
