import React from "react";
import { AbsoluteFill } from "remotion";
import { Caption } from "../components/Caption";
import { BrowserWindow } from "../components/BrowserWindow";
import { theme } from "../theme";

export const SCENE_3_DURATION = 180;

export const Scene3Study: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.canvasSoft }}>
      <Caption text="Master your syllabus & flashcards." duration={SCENE_3_DURATION} />
      <BrowserWindow title="LifeOS — Study Planner">
        {/* Placeholder for Scene 3 */}
      </BrowserWindow>
    </AbsoluteFill>
  );
};
