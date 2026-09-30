import React from "react";
import { AbsoluteFill } from "remotion";
import { Caption } from "../components/Caption";
import { BrowserWindow } from "../components/BrowserWindow";
import { theme } from "../theme";

export const SCENE_1_DURATION = 150;

export const Scene1Hook: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.canvasSoft }}>
      <Caption text="Your entire life in one system." duration={SCENE_1_DURATION} />
      <BrowserWindow title="LifeOS — Dashboard">
        {/* Placeholder for Scene 1 */}
      </BrowserWindow>
    </AbsoluteFill>
  );
};
