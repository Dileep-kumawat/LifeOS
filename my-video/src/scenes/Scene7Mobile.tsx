import React from "react";
import { AbsoluteFill } from "remotion";
import { Caption } from "../components/Caption";
import { PhoneFrame } from "../components/PhoneFrame";
import { theme } from "../theme";

export const SCENE_7_DURATION = 120;

export const Scene7Mobile: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.canvasSoft }}>
      <Caption text="Sync across web and Android." duration={SCENE_7_DURATION} />
      <PhoneFrame>
        {/* Placeholder for Scene 7 */}
      </PhoneFrame>
    </AbsoluteFill>
  );
};
