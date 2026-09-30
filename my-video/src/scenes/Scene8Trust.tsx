import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { Download, Trash2, Ban } from "lucide-react";
import { Caption } from "../components/Caption";
import { easings } from "../motion";
import { theme } from "../theme";

export const SCENE_8_DURATION = 90; // 3 seconds at 30 fps (hard cut to Scene 9)

export const Scene8Trust: React.FC = () => {
  const frame = useCurrentFrame();

  // ============================================================
  // Subtle Slow Drift / Lift (f60 - f90): cards lift 4px
  // ============================================================
  const liftY = interpolate(frame, [60, 90], [0, -4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });

  // ============================================================
  // Three horizontal cards pop in one per beat (f10, f25, f40)
  // ============================================================

  // Card 1: Download icon "Export all your data" (f10)
  const c1Prog = interpolate(frame, [10, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.pop,
  });
  const c1Scale = interpolate(c1Prog, [0, 1], [0.88, 1]);
  const c1Opacity = interpolate(frame, [10, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Card 2: Trash2 icon "Delete anytime" (f25)
  const c2Prog = interpolate(frame, [25, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.pop,
  });
  const c2Scale = interpolate(c2Prog, [0, 1], [0.88, 1]);
  const c2Opacity = interpolate(frame, [25, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Card 3: Ban icon "Ad-free" (f40)
  const c3Prog = interpolate(frame, [40, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.pop,
  });
  const c3Scale = interpolate(c3Prog, [0, 1], [0.88, 1]);
  const c3Opacity = interpolate(frame, [40, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Card specs: sticker colors matching brief §2
  const trustCards = [
    {
      id: "export",
      icon: Download,
      label: "Export all your data",
      tag: "JSON archive",
      iconColor: "#0d9488", // Teal sticker color
      tileBg: "#e6faf8",
      scale: c1Scale,
      opacity: c1Opacity,
      visible: frame >= 10,
    },
    {
      id: "delete",
      icon: Trash2,
      label: "Delete anytime",
      tag: "Instant wipe",
      iconColor: "#0284c7", // Sky sticker color
      tileBg: "#e0f2fe",
      scale: c2Scale,
      opacity: c2Opacity,
      visible: frame >= 25,
    },
    {
      id: "adfree",
      icon: Ban,
      label: "Ad-free",
      tag: "100% private",
      iconColor: "#9333ea", // Purple sticker color
      tileBg: "#f3e8ff",
      scale: c3Scale,
      opacity: c3Opacity,
      visible: frame >= 40,
    },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#213183", // Full-frame deep indigo (only dark scene)
        fontFamily: theme.fontFamily,
        overflow: "hidden",
      }}
    >
      {/* Top Caption (White text) from f0 */}
      <Caption
        text="Your data. Your call."
        startFrame={0}
        duration={SCENE_8_DURATION}
        style={{
          color: "#ffffff",
          letterSpacing: "-2px",
        }}
      />

      {/* Cards Group Container (Centered vertically & horizontally) */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "54%",
          transform: `translate(-50%, calc(-50% + ${liftY}px))`,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          width: 860,
          alignItems: "center",
        }}
      >
        {trustCards.map((card) => {
          if (!card.visible) {
            return (
              <div
                key={card.id}
                style={{
                  width: "100%",
                  height: 112,
                  visibility: "hidden",
                }}
              />
            );
          }

          const IconComp = card.icon;

          return (
            <div
              key={card.id}
              style={{
                width: "100%",
                height: 112,
                backgroundColor: "#ffffff",
                borderRadius: 22,
                boxShadow: "0 14px 34px rgba(0, 0, 0, 0.22)", // Pure shadow, strictly no glows
                padding: "0 36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxSizing: "border-box",
                opacity: card.opacity,
                transform: `scale(${card.scale})`,
                transformOrigin: "center center",
              }}
            >
              {/* Left: Icon Tile + Claim Label */}
              <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    backgroundColor: card.tileBg,
                    color: card.iconColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconComp size={32} strokeWidth={2.4} />
                </div>

                <span
                  style={{
                    fontSize: 30,
                    fontWeight: 700,
                    color: "#111827",
                    letterSpacing: "-0.6px",
                  }}
                >
                  {card.label}
                </span>
              </div>

              {/* Right: Clean Privacy Tag */}
              <span
                style={{
                  backgroundColor: "#f6f5f4",
                  borderRadius: theme.radii.full,
                  border: `1px solid ${theme.colors.hairline}`,
                  padding: "6px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: theme.colors.inkSecondary,
                }}
              >
                {card.tag}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Also export as Scene8Privacy for backward-compatibility
export const Scene8Privacy = Scene8Trust;
