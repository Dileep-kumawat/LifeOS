import React from "react";
import { AbsoluteFill } from "remotion";
import { Caption } from "../components/Caption";
import { BrowserWindow } from "../components/BrowserWindow";
import { theme } from "../theme";

export const SCENE_4_DURATION = 210;

export const Scene4Focus: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.canvasSoft }}>
      <Caption text="Lock in with deep focus." duration={SCENE_4_DURATION} />
      <BrowserWindow title="LifeOS — Focus & Pomodoro">
        {/* Placeholder for Scene 4 */}
      </BrowserWindow>
    </AbsoluteFill>
  );
};
