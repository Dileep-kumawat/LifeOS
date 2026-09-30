import React from "react";
import { Composition } from "remotion";
import "./index.css";
import { FPS } from "./motion";
import { Main, TOTAL_DURATION } from "./Main";
import { MainVertical } from "./MainVertical";
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

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Complete 44s Launch Video (1920x1080 @ 30fps) */}
      <Composition
        id="Main"
        component={Main}
        durationInFrames={TOTAL_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* Vertical Version (1080x1920 @ 30fps) */}
      <Composition
        id="MainVertical"
        component={MainVertical}
        durationInFrames={TOTAL_DURATION}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* Individual Scene Compositions (previewable standalone) */}
      <Composition
        id="Scene1Hook"
        component={Scene1Hook}
        durationInFrames={SCENE_1_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene2Problem"
        component={Scene2Problem}
        durationInFrames={SCENE_2_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene3Study"
        component={Scene3Study}
        durationInFrames={SCENE_3_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene4Focus"
        component={Scene4Focus}
        durationInFrames={SCENE_4_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene5Habits"
        component={Scene5Habits}
        durationInFrames={SCENE_5_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene6AI"
        component={Scene6AI}
        durationInFrames={SCENE_6_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene7Mobile"
        component={Scene7Mobile}
        durationInFrames={SCENE_7_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene8Privacy"
        component={Scene8Privacy}
        durationInFrames={SCENE_8_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene9End"
        component={Scene9End}
        durationInFrames={SCENE_9_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
