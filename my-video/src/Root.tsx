import React from "react";
import { Composition } from "remotion";
import "./index.css";
import { FPS } from "./motion";
import { Main, TOTAL_DURATION } from "./Main";
import { MainVertical } from "./MainVertical";
import {
  Scene1Hook,
  Scene2Problem,
  Scene2Logo,
  Scene3Brief,
  Scene4AI,
  Scene5Study,
  Scene6Montage,
  Scene7Mobile,
  Scene8Privacy,
  Scene8Trust,
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
        id="Scene2Logo"
        component={Scene2Problem}
        durationInFrames={SCENE_2_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene3Brief"
        component={Scene3Brief}
        durationInFrames={SCENE_3_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene4AI"
        component={Scene4AI}
        durationInFrames={SCENE_4_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene5Study"
        component={Scene5Study}
        durationInFrames={SCENE_5_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene6Montage"
        component={Scene6Montage}
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
        id="Scene8Trust"
        component={Scene8Trust}
        durationInFrames={SCENE_8_DURATION}
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
