import React from "react";
import { AbsoluteFill } from "remotion";
import { Caption } from "../components/Caption";
import { theme } from "../theme";

export const SCENE_9_DURATION = 120;

export const Scene9End: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.canvasSoft }}>
      <Caption text="Free to start today." duration={SCENE_9_DURATION} />
      {/* Placeholder for Scene 9 (Outro & Brand CTA) */}
    </AbsoluteFill>
  );
};
