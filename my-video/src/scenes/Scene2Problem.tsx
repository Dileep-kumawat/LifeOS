import React from "react";
import { AbsoluteFill } from "remotion";
import { Caption } from "../components/Caption";
import { theme } from "../theme";

export const SCENE_2_DURATION = 90;

export const Scene2Problem: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.canvasSoft }}>
      <Caption text="Stop switching between 10 apps." duration={SCENE_2_DURATION} />
      {/* Placeholder for Scene 2 (App Fragmentation) */}
    </AbsoluteFill>
  );
};
