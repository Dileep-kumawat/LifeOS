import React from "react";
import { Series } from "remotion";
import { Soundtrack } from "./components/Soundtrack";
import {
  Scene1Hook,
  Scene2Problem,
  Scene3Brief,
  Scene4AI,
  Scene5Study,
  Scene6Montage,
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
  SCENE_9_DURATION; // 1320 frames = 44.0 seconds at 30 fps

/**
 * Main composition:
 * - 44-second launch video (1320 frames at 30 FPS)
 * - All 9 scenes sequenced in <Series> with hard cuts
 * - Background music (public/music.mp3) with smooth fade-in/fade-out
 * - Procedural/production-ready sound effects for every pop, click, cut, and reveal
 */
export const Main: React.FC = () => {
  return (
    <>
      {/* Complete Audio Track (Music + SFX Cues) */}
      <Soundtrack />

      {/* Visual Sequence with Hard Cuts */}
      <Series>
        <Series.Sequence durationInFrames={SCENE_1_DURATION}>
          <Scene1Hook />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE_2_DURATION}>
          <Scene2Problem />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE_3_DURATION}>
          <Scene3Brief />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE_4_DURATION}>
          <Scene4AI />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE_5_DURATION}>
          <Scene5Study />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE_6_DURATION}>
          <Scene6Montage />
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
    </>
  );
};
