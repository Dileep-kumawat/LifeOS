import React from "react";
import { Audio, interpolate, staticFile } from "remotion";
import { SfxCue } from "./SfxCue";

/**
 * Complete Audio & Sound Design Track:
 * - Background music: public/music.mp3 (0.55 base volume, fade-in 15f, fade-out 45f)
 * - SFX Cues: Subtle pops, clicks, hits, chimes, whooshes at exact global frames
 * - All cues kept at ~30-40% of music volume (0.16 - 0.22)
 */
export const Soundtrack: React.FC = () => {
  return (
    <>
      {/* ======================================================== */}
      {/* Background Music Track */}
      {/* ======================================================== */}
      <Audio
        src={staticFile("music.mp3")}
        volume={(f) =>
          interpolate(f, [0, 15, 1275, 1320], [0, 0.55, 0.55, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />

      {/* ======================================================== */}
      {/* SCENE 1: THE CHAOS HOOK (f0 - f150) */}
      {/* ======================================================== */}
      {/* Giant "46" pops in */}
      <SfxCue at={0} src="sfx/pop.wav" volume={0.18} />

      {/* 10 Generic App Tiles pop in sequentially */}
      <SfxCue at={30} src="sfx/pop.wav" volume={0.15} />
      <SfxCue at={39} src="sfx/pop.wav" volume={0.15} />
      <SfxCue at={48} src="sfx/pop.wav" volume={0.15} />
      <SfxCue at={57} src="sfx/pop.wav" volume={0.15} />
      <SfxCue at={66} src="sfx/pop.wav" volume={0.15} />
      <SfxCue at={75} src="sfx/pop.wav" volume={0.15} />
      <SfxCue at={84} src="sfx/pop.wav" volume={0.15} />
      <SfxCue at={93} src="sfx/pop.wav" volume={0.15} />
      <SfxCue at={102} src="sfx/pop.wav" volume={0.15} />
      <SfxCue at={111} src="sfx/pop.wav" volume={0.15} />

      {/* Tension riser building from global frame 90 to 150 */}
      <SfxCue at={90} src="sfx/riser.wav" volume={0.20} />

      {/* ======================================================== */}
      {/* SCENE 2: LIFEOS REVEAL (f150 - f240) */}
      {/* ======================================================== */}
      {/* Soft chime at the ribbon logo reveal (f180 = Scene2 f30) */}
      <SfxCue at={180} src="sfx/chime.wav" volume={0.22} />
      {/* Wordmark slides in (f200 = Scene2 f50) */}
      <SfxCue at={200} src="sfx/pop.wav" volume={0.16} />

      {/* ======================================================== */}
      {/* SCENE 3: MORNING BRIEF (f240 - f420) */}
      {/* ======================================================== */}
      {/* Banner drops from top (f240) */}
      <SfxCue at={240} src="sfx/whoosh.wav" volume={0.16} />
      {/* Priority 1, 2, 3 numbered badges pop in sequentially */}
      <SfxCue at={300} src="sfx/pop.wav" volume={0.18} />
      <SfxCue at={315} src="sfx/pop.wav" volume={0.18} />
      <SfxCue at={330} src="sfx/pop.wav" volume={0.18} />
      {/* Yesterday's Wins check reveal (f345) */}
      <SfxCue at={345} src="sfx/tick.wav" volume={0.16} />
      {/* Today's Flow event pills reveal (f360) */}
      <SfxCue at={360} src="sfx/tick.wav" volume={0.16} />

      {/* ======================================================== */}
      {/* SCENE 4: AI ASSISTANT & CALENDAR (f420 - f630) */}
      {/* ======================================================== */}
      {/* Cursor click on input capsule (f435 = Scene4 f15) */}
      <SfxCue at={435} src="sfx/click.wav" volume={0.18} />
      {/* User message submits into bubble (f495 = Scene4 f75) */}
      <SfxCue at={495} src="sfx/pop.wav" volume={0.16} />
      {/* Tool confirmation card slides up (f560 = Scene4 f140) */}
      <SfxCue at={560} src="sfx/whoosh.wav" volume={0.16} />
      {/* Cursor click on Confirm button (f585 = Scene4 f165) */}
      <SfxCue at={585} src="sfx/click.wav" volume={0.20} />
      {/* Success chime & calendar event slot lock (f592 = Scene4 f172) */}
      <SfxCue at={592} src="sfx/success.wav" volume={0.22} />

      {/* ======================================================== */}
      {/* SCENE 5: STUDY PLANNER & FLASHCARDS (f630 - f810) */}
      {/* ======================================================== */}
      {/* Subject cards stagger in */}
      <SfxCue at={630} src="sfx/pop.wav" volume={0.16} />
      <SfxCue at={642} src="sfx/pop.wav" volume={0.16} />
      <SfxCue at={654} src="sfx/pop.wav" volume={0.16} />
      {/* Cursor click "Open Review Queue" (f692 = Scene5 f62) */}
      <SfxCue at={692} src="sfx/click.wav" volume={0.20} />
      {/* Flashcard 3D flip whoosh (f725 = Scene5 f95) */}
      <SfxCue at={725} src="sfx/whoosh.wav" volume={0.22} />
      {/* Rating buttons pop in (f750 = Scene5 f120) */}
      <SfxCue at={750} src="sfx/pop.wav" volume={0.16} />
      {/* Rating button 4 click (f765 = Scene5 f135) */}
      <SfxCue at={765} src="sfx/click.wav" volume={0.20} />
      {/* Card dismiss slide-out (f775 = Scene5 f145) */}
      <SfxCue at={775} src="sfx/whoosh.wav" volume={0.16} />

      {/* ======================================================== */}
      {/* SCENE 6: SPEED MONTAGE (f810 - f990) */}
      {/* ======================================================== */}
      {/* Montage Cut 1: Focus (f810) */}
      <SfxCue at={810} src="sfx/hit.wav" volume={0.20} />
      {/* Montage Cut 2: Habits (f855) */}
      <SfxCue at={855} src="sfx/hit.wav" volume={0.20} />
      {/* Habits "Mark Done" click & streak pop (f871 = Scene6 f61) */}
      <SfxCue at={871} src="sfx/click.wav" volume={0.20} />
      <SfxCue at={872} src="sfx/pop.wav" volume={0.18} />
      {/* Montage Cut 3: Finance (f900) */}
      <SfxCue at={900} src="sfx/hit.wav" volume={0.20} />
      {/* Montage Cut 4: Notes (f945) */}
      <SfxCue at={945} src="sfx/hit.wav" volume={0.20} />

      {/* ======================================================== */}
      {/* SCENE 7: MOBILE DOCK & ECOSYSTEM (f990 - f1110) */}
      {/* ======================================================== */}
      {/* Phone slides up (f990) */}
      <SfxCue at={990} src="sfx/whoosh.wav" volume={0.16} />
      {/* Dock tick 1: Dashboard -> Habits (f1028 = Scene7 f38) */}
      <SfxCue at={1028} src="sfx/tick.wav" volume={0.18} />
      {/* Dock tick 2: Habits -> Study (f1061 = Scene7 f71) */}
      <SfxCue at={1061} src="sfx/tick.wav" volume={0.18} />

      {/* ======================================================== */}
      {/* SCENE 8: TRUST & PRIVACY (f1110 - f1200) */}
      {/* ======================================================== */}
      {/* Card 1: "Export all your data" (f1120 = Scene8 f10) */}
      <SfxCue at={1120} src="sfx/pop.wav" volume={0.18} />
      {/* Card 2: "Delete anytime" (f1135 = Scene8 f25) */}
      <SfxCue at={1135} src="sfx/pop.wav" volume={0.18} />
      {/* Card 3: "Ad-free" (f1150 = Scene8 f40) */}
      <SfxCue at={1150} src="sfx/pop.wav" volume={0.18} />

      {/* ======================================================== */}
      {/* SCENE 9: OUTRO & CALL TO ACTION (f1200 - f1320) */}
      {/* ======================================================== */}
      {/* LifeOS ribbon pop in (f1200) */}
      <SfxCue at={1200} src="sfx/pop.wav" volume={0.20} />
      {/* Wordmark slide in (f1210) */}
      <SfxCue at={1210} src="sfx/whoosh.wav" volume={0.16} />
      {/* "Start free" button pop in (f1250) */}
      <SfxCue at={1250} src="sfx/pop.wav" volume={0.22} />
    </>
  );
};
