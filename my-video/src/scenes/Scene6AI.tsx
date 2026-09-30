import React from "react";
import { AbsoluteFill } from "remotion";
import { Caption } from "../components/Caption";
import { BrowserWindow } from "../components/BrowserWindow";
import { theme } from "../theme";

export const SCENE_6_DURATION = 180;

export const Scene6AI: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.canvasSoft }}>
      <Caption text="Context-aware AI copilot." duration={SCENE_6_DURATION} />
      <BrowserWindow title="LifeOS — AI Assistant">
        {/* Placeholder for Scene 6 */}
      </BrowserWindow>
    </AbsoluteFill>
  );
};
