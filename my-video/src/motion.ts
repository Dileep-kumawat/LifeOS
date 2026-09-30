import { Easing, interpolate } from "remotion";

export const FPS = 30;
export const BEAT = 15; // 120 BPM: 1 beat = 15 frames at 30 fps

export const easings = {
  // Spring / Pop: cubic-bezier(0.34, 1.56, 0.64, 1) - badges, checkmarks, stickers
  pop: Easing.bezier(0.34, 1.56, 0.64, 1),
  // Deceleration / Lift: cubic-bezier(0.16, 1, 0.3, 1) - cards, dialogs, panels
  decel: Easing.bezier(0.16, 1, 0.3, 1),
  // Standard Transition: cubic-bezier(0.4, 0, 0.2, 1) - smooth UI morphs
  standard: Easing.bezier(0.4, 0, 0.2, 1),
} as const;

/**
 * Scale + Fade pop-in animation helper
 */
export const popIn = (
  frame: number,
  delay: number = 0,
  duration: number = 10
) => {
  const scale = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.pop,
  });
  const opacity = interpolate(
    frame,
    [delay, delay + Math.min(duration, 5)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  return {
    scale,
    opacity,
    value: scale,
    transform: `scale(${scale})`,
  };
};

/**
 * Rise from bottom + Fade-in animation helper
 */
export const riseIn = (
  frame: number,
  delay: number = 0,
  duration: number = 10,
  distance: number = 20
) => {
  const translateY = interpolate(
    frame,
    [delay, delay + duration],
    [distance, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: easings.decel,
    }
  );
  const opacity = interpolate(
    frame,
    [delay, delay + Math.min(duration, 6)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: easings.decel,
    }
  );
  return {
    translateY,
    opacity,
    transform: `translateY(${translateY}px)`,
    translate: `0px ${translateY}px`,
  };
};

/**
 * Fade-out helper leading up to endFrame
 */
export const fadeOut = (
  frame: number,
  endFrame: number,
  duration: number = 6
): number => {
  return interpolate(frame, [endFrame - duration, endFrame], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.standard,
  });
};
