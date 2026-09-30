import React from "react";
import { AbsoluteFill } from "remotion";
import { Caption } from "../components/Caption";
import { BrowserWindow } from "../components/BrowserWindow";
import { theme } from "../theme";

export const SCENE_5_DURATION = 180;

export const Scene5Habits: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.canvasSoft }}>
      <Caption text="Build habits that stick." duration={SCENE_5_DURATION} />
      <BrowserWindow title="LifeOS — Habits & Streaks">
        {/* Placeholder for Scene 5 */}
      </BrowserWindow>
    </AbsoluteFill>
  );
};
