import React from "react";
import { Series } from "remotion";
import {
  Scene1Hook,
  Scene2Problem,
  Scene3Study,
  Scene4Focus,
  Scene5Habits,
  Scene6AI,
  Scene7Mobile,
  Scene8Privacy,
  Scene9End,
  SCENE_1_DURATION,
  SCENE_2_DURATION,
  SCENE_3_DURATION,
  SCENE_4_DURATION,
  SCENE_5_DURATION,
  SCENE_6_DURATION,
  SCENE_7_DURATION,
  SCENE_8_DURATION,
  SCENE_9_DURATION,
} from "./scenes";

export const TOTAL_DURATION =
  SCENE_1_DURATION +
  SCENE_2_DURATION +
  SCENE_3_DURATION +
  SCENE_4_DURATION +
  SCENE_5_DURATION +
  SCENE_6_DURATION +
  SCENE_7_DURATION +
  SCENE_8_DURATION +
  SCENE_9_DURATION; // 1320 frames = 44 seconds at 30 fps

/**
 * Main composition:
 * - 44-second launch video (1320 frames at 30 FPS)
 * - All 9 scenes sequenced in <Series>
 * - Hard cuts only (no transitions)
 */
export const Main: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={SCENE_1_DURATION}>
        <Scene1Hook />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_2_DURATION}>
        <Scene2Problem />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_3_DURATION}>
        <Scene3Study />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_4_DURATION}>
        <Scene4Focus />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_5_DURATION}>
        <Scene5Habits />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_6_DURATION}>
        <Scene6AI />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_7_DURATION}>
        <Scene7Mobile />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_8_DURATION}>
        <Scene8Privacy />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_9_DURATION}>
        <Scene9End />
      </Series.Sequence>
    </Series>
  );
};
