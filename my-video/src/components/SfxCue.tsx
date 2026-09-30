import React from "react";
import { Audio, Sequence, staticFile } from "remotion";

export interface SfxCueProps {
  at: number; // Global frame number to trigger the cue
  src: string; // Path relative to public/ e.g. "sfx/pop.wav"
  volume?: number; // Volume (default 0.18, ~33% of base music volume 0.55)
}

/**
 * SfxCue: Reusable audio cue component.
 * Sequences a sound effect at an exact global frame with subtle volume.
 */
export const SfxCue: React.FC<SfxCueProps> = ({
  at,
  src,
  volume = 0.18,
}) => {
  return (
    <Sequence from={at}>
      <Audio src={staticFile(src)} volume={volume} />
    </Sequence>
  );
};
