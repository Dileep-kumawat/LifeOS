import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { easings } from "../motion";

export interface CursorKeyframe {
  frame: number;
  x: number;
  y: number;
  click?: boolean;
}

export interface FakeCursorProps {
  keyframes?: CursorKeyframe[];
  x?: number;
  y?: number;
  clicking?: boolean;
  style?: React.CSSProperties;
}

/**
 * FakeCursor component:
 * - Crisp OS arrow cursor (black with hairline white stroke)
 * - Traverses keyframe positions smoothly with interpolation
 * - Triggers a tactile blue ripple ring on click
 */
export const FakeCursor: React.FC<FakeCursorProps> = ({
  keyframes,
  x: manualX,
  y: manualY,
  clicking: manualClicking,
  style,
}) => {
  const currentFrame = useCurrentFrame();

  let posX = manualX ?? 0;
  let posY = manualY ?? 0;
  let isClicking = manualClicking ?? false;
  let clickAge = -1; // frames since click start

  if (keyframes && keyframes.length > 0) {
    if (keyframes.length === 1) {
      posX = keyframes[0].x;
      posY = keyframes[0].y;
    } else {
      const framePoints = keyframes.map((k) => k.frame);
      const xPoints = keyframes.map((k) => k.x);
      const yPoints = keyframes.map((k) => k.y);

      posX = interpolate(currentFrame, framePoints, xPoints, {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: easings.standard,
      });

      posY = interpolate(currentFrame, framePoints, yPoints, {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: easings.standard,
      });
    }

    // Detect if within a click event window (lasts 14 frames)
    for (const kf of keyframes) {
      if (kf.click && currentFrame >= kf.frame && currentFrame < kf.frame + 14) {
        isClicking = true;
        clickAge = currentFrame - kf.frame;
        break;
      }
    }
  }

  // Pointer click scale dip: 1 -> 0.88 -> 1
  let pointerScale = 1;
  let rippleRadius = 0;
  let rippleOpacity = 0;

  if (isClicking) {
    const age = clickAge >= 0 ? clickAge : 0;
    pointerScale = interpolate(age, [0, 3, 10], [1, 0.85, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    rippleRadius = interpolate(age, [0, 14], [4, 30], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: easings.decel,
    });

    rippleOpacity = interpolate(age, [0, 2, 14], [0.3, 0.85, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  return (
    <div
      style={{
        position: "absolute",
        left: posX,
        top: posY,
        pointerEvents: "none",
        zIndex: 9999,
        transform: `scale(${pointerScale})`,
        transformOrigin: "0 0",
        ...style,
      }}
    >
      {/* Click ripple animation */}
      {isClicking && rippleOpacity > 0 && (
        <svg
          style={{
            position: "absolute",
            left: -32,
            top: -32,
            width: 64,
            height: 64,
            pointerEvents: "none",
          }}
        >
          <circle
            cx={32}
            cy={32}
            r={rippleRadius}
            fill="none"
            stroke="#0075de"
            strokeWidth={2.5}
            opacity={rippleOpacity}
          />
        </svg>
      )}

      {/* SVG Precision Pointer */}
      <svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        style={{
          filter: "drop-shadow(0 2px 5px rgba(0, 0, 0, 0.28))",
          overflow: "visible",
        }}
      >
        <path
          d="M 1 1 L 1 19 L 6 14.5 L 10.5 23.5 L 14 22 L 9.5 13 L 17 13 Z"
          fill="#111111"
          stroke="#ffffff"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
