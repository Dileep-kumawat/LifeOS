import React from "react";
import { AbsoluteFill } from "remotion";
import { Caption } from "../components/Caption";
import { theme } from "../theme";

export const SCENE_8_DURATION = 90;

export const Scene8Privacy: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.canvasSoft }}>
      {/* Strict privacy claim: export data, delete anytime, ad-free only */}
      <Caption text="Your data is always yours." duration={SCENE_8_DURATION} />
      {/* Placeholder for Scene 8 */}
    </AbsoluteFill>
  );
};
