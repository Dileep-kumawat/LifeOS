import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { CONFIG } from "../demoData";
import { easings } from "../motion";
import { theme } from "../theme";

export const SCENE_9_DURATION = 120; // 4 seconds at 30 fps (final outro hold)

export const Scene9End: React.FC = () => {
  const frame = useCurrentFrame();

  // ============================================================
  // f0 - f25: Brand Lockup Entry
  // Ribbon mark scales in with pop spring (f0-f14)
  // Wordmark slides in next to it (f10-f24)
  // ============================================================
  const ribbonProg = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.pop,
  });
  const ribbonScale = interpolate(ribbonProg, [0, 1], [0.6, 1]);
  const ribbonOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const wordmarkProg = interpolate(frame, [10, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });
  const wordmarkTranslateX = interpolate(wordmarkProg, [0, 1], [-20, 0]);
  const wordmarkOpacity = interpolate(frame, [10, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ============================================================
  // f25 - f50: Headline Rises In
  // "Your whole student life. One workspace."
  // ============================================================
  const headlineProg = interpolate(frame, [25, 42], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });
  const headlineTranslateY = interpolate(headlineProg, [0, 1], [24, 0]);
  const headlineOpacity = interpolate(frame, [25, 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ============================================================
  // f50 - f120: CTA Section ("Start free", URL, Subtext)
  // Subtle pulsing ring during f62 - f90
  // Completely static hold for last 30 frames (f90 - f120)
  // ============================================================
  const ctaProg = interpolate(frame, [50, 62], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.pop,
  });
  const ctaScale = interpolate(ctaProg, [0, 1], [0.85, 1]);
  const ctaOpacity = interpolate(frame, [50, 56], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slow subtle pulsing ring (not a glow) active only between f62 and f90
  const isPulsing = frame >= 62 && frame < 90;
  const pulseAge = isPulsing ? (frame - 62) % 28 : 0;
  const ringProg = pulseAge / 28; // 0 to 1 over ~0.93s
  const ringScale = isPulsing ? interpolate(ringProg, [0, 1], [1, 1.25]) : 1;
  const ringOpacity = isPulsing ? interpolate(ringProg, [0, 0.3, 1], [0.6, 0.45, 0]) : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff", // Pure white background
        fontFamily: theme.fontFamily,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Centered Main Outro Stack */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        {/* ======================================================== */}
        {/* 1. LifeOS Brand Lockup (Ribbon + Wordmark) */}
        {/* ======================================================== */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
          }}
        >
          {/* Ribbon Mark */}
          <div
            style={{
              width: 96,
              height: 68,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: ribbonOpacity,
              transform: `scale(${ribbonScale})`,
              transformOrigin: "center center",
            }}
          >
            <Img
              src={staticFile("video-assets/logo-ribbon-transparent.png")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>

          {/* Wordmark: "LifeOS" */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              opacity: wordmarkOpacity,
              transform: `translateX(${wordmarkTranslateX}px)`,
              userSelect: "none",
            }}
          >
            <span
              style={{
                fontSize: 84,
                fontWeight: 700,
                color: "#111827",
                letterSpacing: "-3.5px",
                lineHeight: 1,
              }}
            >
              Life
            </span>
            <span
              style={{
                fontSize: 84,
                fontWeight: 700,
                letterSpacing: "-3.5px",
                lineHeight: 1,
                background: "linear-gradient(135deg, #0080ff 0%, #00d2ff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                display: "inline-block",
              }}
            >
              OS
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. Headline: "Your whole student life. One workspace." */}
        {/* ======================================================== */}
        <div
          style={{
            marginTop: 28,
            fontSize: 48,
            lineHeight: "54px",
            fontWeight: 700,
            color: "#111827",
            letterSpacing: "-1.25px",
            opacity: headlineOpacity,
            transform: `translateY(${headlineTranslateY}px)`,
            maxWidth: 1000,
          }}
        >
          Your whole student life. One workspace.
        </div>

        {/* ======================================================== */}
        {/* 3. CTA Container: Button, URL, Platform Subtext */}
        {/* ======================================================== */}
        <div
          style={{
            marginTop: 42,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
            transformOrigin: "center center",
          }}
        >
          {/* "Start free" Button with Pulsing Ring */}
          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Subtle Expanding Pulsing Ring (not a glow) */}
            {isPulsing && (
              <div
                style={{
                  position: "absolute",
                  inset: -4,
                  borderRadius: theme.radii.full,
                  border: "2px solid #0075de",
                  transform: `scale(${ringScale})`,
                  opacity: ringOpacity,
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Solid Pill Button */}
            <div
              style={{
                backgroundColor: "#0075de",
                color: "#ffffff",
                borderRadius: theme.radii.full,
                padding: "16px 48px",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-0.2px",
                boxShadow: "0 4px 16px rgba(0, 117, 222, 0.32)",
                userSelect: "none",
              }}
            >
              {CONFIG.cta}
            </div>
          </div>

          {/* Inspiring Brand Line */}
          <div
            style={{
              marginTop: 20,
              fontSize: 24,
              fontWeight: 600,
              color: "#374151",
              letterSpacing: "-0.4px",
            }}
          >
            From daily chaos to{" "}
            <span
              style={{
                color: "#0075de",
                fontWeight: 700,
              }}
            >
              quiet clarity.
            </span>
          </div>

          {/* Platform Availability Subtext */}
          <div
            style={{
              marginTop: 8,
              fontSize: 16,
              fontWeight: 600,
              color: theme.colors.inkSecondary,
              letterSpacing: "-0.2px",
            }}
          >
            Free to start | Web + Android
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
