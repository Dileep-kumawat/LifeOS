import React from "react";
import { AbsoluteFill } from "remotion";
import { Main } from "./Main";
import { theme } from "./theme";

/**
 * MainVertical composition:
 * - 1080x1920 (9:16 vertical reels/shorts preview)
 * - 1320 frames at 30 fps
 */
export const MainVertical: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.canvasSoft,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 1920,
          height: 1080,
          transform: "scale(0.5625)", // scale 1920x1080 down to 1080px width
          transformOrigin: "center center",
        }}
      >
        <Main />
      </div>
    </AbsoluteFill>
  );
};
