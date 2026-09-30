import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { easings } from "../motion";
import { theme } from "../theme";

export interface CaptionProps {
  text: string;
  startFrame?: number;
  duration?: number; // duration of caption in frames
  style?: React.CSSProperties;
}

/**
 * Top-center caption component:
 * - Positioned in the top 180px band
 * - Inter 700 ~64px ink #000 (brief §2 exact display1)
 * - 10-frame rise + fade entry
 * - 6-frame fade exit
 * - Max ~5 words per brief rules
 */
export const Caption: React.FC<CaptionProps> = ({
  text,
  startFrame = 0,
  duration,
  style,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const totalDuration = duration ?? durationInFrames - startFrame;
  const relFrame = frame - startFrame;
  const endRelFrame = totalDuration;

  // 10-frame rise + fade entry
  const translateY = interpolate(relFrame, [0, 10], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });

  const fadeIn = interpolate(relFrame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });

  // 6-frame fade exit
  const fadeOut = interpolate(
    relFrame,
    [endRelFrame - 6, endRelFrame],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: easings.standard,
    }
  );

  const opacity = Math.max(0, Math.min(1, fadeIn * fadeOut));

  // If outside the active frame window, render nothing
  if (relFrame < 0 || relFrame > endRelFrame) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: 180,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      <div
        style={{
          fontFamily: theme.fontFamily,
          fontSize: 64,
          lineHeight: "64px",
          fontWeight: 700,
          letterSpacing: "-2.125px",
          color: theme.colors.ink,
          textAlign: "center",
          opacity,
          transform: `translateY(${translateY}px)`,
          maxWidth: 1200,
          paddingLeft: 24,
          paddingRight: 24,
          ...style,
        }}
      >
        {text}
      </div>
    </div>
  );
};
