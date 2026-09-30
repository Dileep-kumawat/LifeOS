import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import {
  GraduationCap,
  Plus,
  ArrowRight,
  Layers,
  Calendar,
  Clock,
  Flame,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { Caption } from "../components/Caption";
import { BrowserWindow } from "../components/BrowserWindow";
import { FakeCursor } from "../components/FakeCursor";
import { easings } from "../motion";
import { theme } from "../theme";
import { SUBJECTS } from "../demoData";

export const SCENE_5_DURATION = 180; // 6 seconds at 30 fps

export const Scene5Study: React.FC = () => {
  const frame = useCurrentFrame();

  // Slow camera push-in: scale 1.00 -> 1.04
  const cameraScale = interpolate(frame, [0, SCENE_5_DURATION], [1.0, 1.04], {
    extrapolateRight: "clamp",
  });

  // ============================================================
  // PHASE 1: Subjects & Syllabus (f0 - f70)
  // ============================================================

  // Card 1 stagger in: f0 - f25
  const card1Prog = interpolate(frame, [0, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });
  const card1TranslateY = interpolate(card1Prog, [0, 1], [30, 0]);

  // Card 2 stagger in: f15 - f37
  const card2Prog = interpolate(frame, [12, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });
  const card2TranslateY = interpolate(card2Prog, [0, 1], [30, 0]);

  // Card 3 stagger in: f25 - f47
  const card3Prog = interpolate(frame, [24, 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });
  const card3TranslateY = interpolate(card3Prog, [0, 1], [30, 0]);

  // Progress bars fill to true value over f10 - f45
  const fillProg = interpolate(frame, [10, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });
  const distBarWidth = fillProg * 33.3; // 1/3 topics = 33%
  const dbBarWidth = 0; // 0/2 topics = 0%
  const algoBarWidth = fillProg * 50; // 1/2 topics = 50%

  // f55-75: View Cross-fade from Subjects View to Flashcard Deck
  const viewSwitchProg = interpolate(frame, [58, 72], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });
  const subjectsViewOpacity = 1 - viewSwitchProg;
  const flashcardViewOpacity = viewSwitchProg;

  // ============================================================
  // PHASE 2: Flashcard 3D Flip & SM-2 Update (f75 - f180)
  // ============================================================

  // f95-113: 3D Y-axis flip (18 frames)
  const flipProg = interpolate(frame, [95, 113], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });
  const cardRotateY = interpolate(flipProg, [0, 1], [0, 180]);
  const cardShadowLift = interpolate(flipProg, [0, 0.5, 1], [16, 38, 16]);

  // f145-170: Card 1 slides away to left
  const cardDismissProg = interpolate(frame, [145, 168], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });
  const cardDismissTranslateX = interpolate(cardDismissProg, [0, 1], [0, -880]);
  const cardDismissRotate = interpolate(cardDismissProg, [0, 1], [0, -12]);
  const cardDismissOpacity = interpolate(cardDismissProg, [0, 0.8, 1], [1, 0.4, 0]);

  // Next card underneath stacks up
  const nextCardScale = interpolate(cardDismissProg, [0, 1], [0.93, 1.0]);
  const nextCardOpacity = interpolate(cardDismissProg, [0, 1], [0.55, 1.0]);

  // Due counter ticks 18 -> 17 at f142
  const dueCount = frame < 142 ? 18 : 17;
  const counterPop = interpolate(frame, [141, 146, 153], [1, 1.25, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // SM-2 stats chip update at f140
  const isSm2Updated = frame >= 140;

  // Button 4 pressed state at f135
  const isBtn4Pressed = frame >= 134 && frame < 142;

  // Review Queue button on hero pressed at f62
  const isHeroBtnPressed = frame >= 61 && frame < 68;

  // FakeCursor Keyframes
  const cursorKeyframes = [
    { frame: 0, x: 1200, y: 380 },
    { frame: 55, x: 1480, y: 360 }, // glide to "Open Review Queue" button
    { frame: 62, x: 1480, y: 360, click: true }, // click "Open Review Queue"
    { frame: 75, x: 1250, y: 600 }, // move away during flip
    { frame: 124, x: 1250, y: 600 },
    { frame: 133, x: 1115, y: 840 }, // move to rating button 4
    { frame: 135, x: 1115, y: 840, click: true }, // click rating button 4
    { frame: 148, x: 1280, y: 860 }, // drift away
    { frame: 195, x: 1380, y: 880 },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.canvasSoft,
        fontFamily: theme.fontFamily,
        overflow: "hidden",
      }}
    >
      {/* Captions: f0-75 "Track every topic." -> f75-195 "Remember it for good." */}
      {frame < 75 ? (
        <Caption text="Track every topic." startFrame={10} duration={65} />
      ) : (
        <Caption text="Remember it for good." startFrame={75} duration={120} />
      )}

      {/* Camera push-in wrapper */}
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transform: `scale(${cameraScale})`,
          transformOrigin: "center 520px",
        }}
      >
        {/* BrowserWindow: centered, 1680px wide (87.5% of 1920), y: 200 to 1000 */}
        <BrowserWindow
          width={1680}
          height={800}
          top={200}
          left="50%"
          title="LifeOS — Study Planner & Spaced Repetition"
          style={{
            borderRadius: 16,
            boxShadow: theme.shadows.level3,
          }}
          bodyStyle={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#faf9f8",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Top Header of Study Planner */}
          <div
            style={{
              height: 68,
              borderBottom: `1px solid ${theme.colors.hairline}`,
              padding: "0 36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#ffffff",
              flexShrink: 0,
            }}
          >
            {/* Title & Graduation Cap Icon */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: "rgba(0, 117, 222, 0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0075de",
                }}
              >
                <GraduationCap size={22} strokeWidth={2.4} />
              </div>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: theme.colors.ink,
                  letterSpacing: "-0.5px",
                }}
              >
                Study Planner
              </span>
            </div>

            {/* Segmented Navigation Tabs */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#f6f5f4",
                padding: "4px",
                borderRadius: 10,
                border: `1px solid ${theme.colors.hairline}`,
                gap: 4,
              }}
            >
              <div
                style={{
                  padding: "6px 18px",
                  borderRadius: 8,
                  backgroundColor: frame < 65 ? "#ffffff" : "transparent",
                  boxShadow:
                    frame < 65 ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                  fontSize: 16,
                  fontWeight: 600,
                  color: frame < 65 ? theme.colors.ink : theme.colors.inkSecondary,
                }}
              >
                Subjects &amp; Syllabus
              </div>

              <div
                style={{
                  padding: "6px 18px",
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  color: theme.colors.inkSecondary,
                }}
              >
                Flashcards Deck
              </div>

              <div
                style={{
                  padding: "6px 18px",
                  borderRadius: 8,
                  backgroundColor: frame >= 65 ? "#ffffff" : "transparent",
                  boxShadow:
                    frame >= 65 ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                  fontSize: 16,
                  fontWeight: 700,
                  color: frame >= 65 ? "#0075de" : theme.colors.inkSecondary,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>Review Queue</span>
                <span
                  style={{
                    backgroundColor: "#0075de",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 700,
                    borderRadius: theme.radii.full,
                    padding: "2px 8px",
                    transform: `scale(${counterPop})`,
                    display: "inline-block",
                  }}
                >
                  {dueCount} due
                </span>
              </div>
            </div>

            {/* "+ New Subject" Button */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                backgroundColor: "#0075de",
                color: "#ffffff",
                padding: "8px 18px",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                boxShadow: "0 2px 8px rgba(0, 117, 222, 0.28)",
              }}
            >
              <Plus size={18} strokeWidth={2.4} />
              <span>New Subject</span>
            </div>
          </div>

          {/* ============================================================ */}
          {/* VIEW 1: Subjects & Syllabus (f0 - f70) */}
          {/* ============================================================ */}
          {subjectsViewOpacity > 0 && (
            <div
              style={{
                position: "absolute",
                top: 68,
                left: 0,
                right: 0,
                bottom: 0,
                padding: "24px 36px",
                display: "flex",
                flexDirection: "column",
                gap: 20,
                opacity: subjectsViewOpacity,
                pointerEvents: frame >= 70 ? "none" : "auto",
              }}
            >
              {/* Spaced Repetition Queue Banner Hero */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: 14,
                  border: `1px solid ${theme.colors.hairline}`,
                  padding: "18px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: "rgba(0, 117, 222, 0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0075de",
                    }}
                  >
                    <Layers size={24} strokeWidth={2.4} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: theme.colors.ink,
                      }}
                    >
                      Spaced Repetition Review Queue
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 500,
                        color: theme.colors.inkSecondary,
                      }}
                    >
                      18 flashcards due today • Optimal recall threshold (SM-2)
                    </div>
                  </div>
                </div>

                {/* "Open Review Queue" Action Button */}
                <div
                  style={{
                    backgroundColor: "#0075de",
                    color: "#ffffff",
                    padding: "12px 24px",
                    borderRadius: 10,
                    fontSize: 17,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: isHeroBtnPressed
                      ? "inset 0 2px 4px rgba(0,0,0,0.2)"
                      : "0 4px 14px rgba(0, 117, 222, 0.35)",
                    transform: isHeroBtnPressed ? "scale(0.96)" : "scale(1)",
                  }}
                >
                  <span>Open Review Queue</span>
                  <ArrowRight size={18} strokeWidth={2.4} />
                </div>
              </div>

              {/* 3 Subject Cards Row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 24,
                  flex: 1,
                }}
              >
                {/* 1. Distributed Systems (Blue #0075de) */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: 16,
                    border: `1px solid ${theme.colors.hairline}`,
                    padding: "20px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
                    opacity: card1Prog,
                    transform: `translateY(${card1TranslateY}px)`,
                  }}
                >
                  {/* Subject Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#0075de",
                        backgroundColor: "rgba(0, 117, 222, 0.10)",
                        padding: "4px 12px",
                        borderRadius: theme.radii.full,
                      }}
                    >
                      46 days left • Nov 15, 2026
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#0075de" }}>
                      1/3 Topics
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: theme.colors.ink,
                      lineHeight: 1.25,
                    }}
                  >
                    Distributed Systems &amp; Cloud
                  </div>

                  {/* Progress Bar */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 14,
                        color: theme.colors.inkSecondary,
                        fontWeight: 600,
                      }}
                    >
                      <span>Progress</span>
                      <span>{Math.round(distBarWidth)}%</span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        backgroundColor: "#f0eeeb",
                        borderRadius: 99,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${distBarWidth}%`,
                          backgroundColor: "#0075de",
                          borderRadius: 99,
                        }}
                      />
                    </div>
                  </div>

                  {/* Highlighted Topic with Priority Pills */}
                  <div
                    style={{
                      marginTop: "auto",
                      backgroundColor: "#f6f5f4",
                      borderRadius: 10,
                      padding: "12px 14px",
                      border: `1px solid ${theme.colors.hairline}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: theme.colors.ink,
                      }}
                    >
                      Raft &amp; Paxos Consensus
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          backgroundColor: "rgba(221, 91, 0, 0.12)",
                          color: "#dd5b00",
                          padding: "2px 8px",
                          borderRadius: theme.radii.full,
                        }}
                      >
                        High Priority
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          backgroundColor: "rgba(0, 117, 222, 0.10)",
                          color: "#0075de",
                          padding: "2px 8px",
                          borderRadius: theme.radii.full,
                        }}
                      >
                        90 min
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          backgroundColor: "rgba(255, 100, 200, 0.14)",
                          color: "#b8127f",
                          padding: "2px 8px",
                          borderRadius: theme.radii.full,
                        }}
                      >
                        Due soon
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Database Management (Purple #8b5cf6) */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: 16,
                    border: `1px solid ${theme.colors.hairline}`,
                    padding: "20px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
                    opacity: card2Prog,
                    transform: `translateY(${card2TranslateY}px)`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#8b5cf6",
                        backgroundColor: "rgba(139, 92, 246, 0.10)",
                        padding: "4px 12px",
                        borderRadius: theme.radii.full,
                      }}
                    >
                      46 days left • Nov 15, 2026
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#8b5cf6" }}>
                      0/2 Topics
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: theme.colors.ink,
                      lineHeight: 1.25,
                    }}
                  >
                    Database Management &amp; Internals
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 14,
                        color: theme.colors.inkSecondary,
                        fontWeight: 600,
                      }}
                    >
                      <span>Progress</span>
                      <span>{dbBarWidth}%</span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        backgroundColor: "#f0eeeb",
                        borderRadius: 99,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${dbBarWidth}%`,
                          backgroundColor: "#8b5cf6",
                          borderRadius: 99,
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "auto",
                      backgroundColor: "#f6f5f4",
                      borderRadius: 10,
                      padding: "12px 14px",
                      border: `1px solid ${theme.colors.hairline}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: theme.colors.ink,
                      }}
                    >
                      B+ Tree Indexing &amp; Buffer Pool
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          backgroundColor: "rgba(221, 91, 0, 0.12)",
                          color: "#dd5b00",
                          padding: "2px 8px",
                          borderRadius: theme.radii.full,
                        }}
                      >
                        High Priority
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          backgroundColor: "rgba(139, 92, 246, 0.10)",
                          color: "#8b5cf6",
                          padding: "2px 8px",
                          borderRadius: theme.radii.full,
                        }}
                      >
                        75 min
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Algorithms & DP (Green #1aae39) */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: 16,
                    border: `1px solid ${theme.colors.hairline}`,
                    padding: "20px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
                    opacity: card3Prog,
                    transform: `translateY(${card3TranslateY}px)`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#1aae39",
                        backgroundColor: "rgba(26, 174, 57, 0.10)",
                        padding: "4px 12px",
                        borderRadius: theme.radii.full,
                      }}
                    >
                      46 days left • Nov 15, 2026
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#1aae39" }}>
                      1/2 Topics
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: theme.colors.ink,
                      lineHeight: 1.25,
                    }}
                  >
                    Algorithms &amp; Dynamic Programming
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 14,
                        color: theme.colors.inkSecondary,
                        fontWeight: 600,
                      }}
                    >
                      <span>Progress</span>
                      <span>{Math.round(algoBarWidth)}%</span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        backgroundColor: "#f0eeeb",
                        borderRadius: 99,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${algoBarWidth}%`,
                          backgroundColor: "#1aae39",
                          borderRadius: 99,
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "auto",
                      backgroundColor: "#f6f5f4",
                      borderRadius: 10,
                      padding: "12px 14px",
                      border: `1px solid ${theme.colors.hairline}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: theme.colors.ink,
                      }}
                    >
                      Knapsack &amp; Interval Scheduling DP
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          backgroundColor: "rgba(221, 91, 0, 0.12)",
                          color: "#dd5b00",
                          padding: "2px 8px",
                          borderRadius: theme.radii.full,
                        }}
                      >
                        High Priority
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          backgroundColor: "rgba(26, 174, 57, 0.10)",
                          color: "#1aae39",
                          padding: "2px 8px",
                          borderRadius: theme.radii.full,
                        }}
                      >
                        80 min
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW 2: Large Centered Flashcard & SM-2 Review (f70 - f195) */}
          {/* ============================================================ */}
          {flashcardViewOpacity > 0 && (
            <div
              style={{
                position: "absolute",
                top: 68,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                opacity: flashcardViewOpacity,
                perspective: 1000,
              }}
            >
              {/* Card Meta Row (Deck, Card index, SM-2 stats chip) */}
              <div
                style={{
                  width: 820,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#0075de",
                    }}
                  >
                    Card {frame < 155 ? "1" : "2"} of 18
                  </span>
                  <span style={{ fontSize: 16, color: theme.colors.inkMuted }}>•</span>
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: theme.colors.inkSecondary,
                    }}
                  >
                    Distributed Systems &amp; Consensus
                  </span>
                </div>

                {/* SM-2 Stats Chip */}
                <div
                  style={{
                    backgroundColor: isSm2Updated
                      ? "rgba(26, 174, 57, 0.14)"
                      : "#ffffff",
                    border: `1px solid ${
                      isSm2Updated ? "#1aae39" : theme.colors.hairline
                    }`,
                    borderRadius: theme.radii.full,
                    padding: "6px 16px",
                    fontSize: 15,
                    fontWeight: 700,
                    color: isSm2Updated ? "#1aae39" : theme.colors.ink,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                  }}
                >
                  {isSm2Updated
                    ? "Reps: 2 | Int: 6d | EF: 2.6"
                    : "Reps: 1 | Int: 1d | EF: 2.6"}
                </div>
              </div>

              {/* Flashcard Container (3D Flip & Stacked Cards) */}
              <div
                style={{
                  position: "relative",
                  width: 820,
                  height: 380,
                }}
              >
                {/* Underneath Next Card (Card 2 of 18) */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "#ffffff",
                    borderRadius: 20,
                    border: `1px solid ${theme.colors.hairline}`,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                    padding: "36px 44px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    gap: 16,
                    transform: `scale(${nextCardScale})`,
                    opacity: nextCardOpacity,
                    userSelect: "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: "0.4px",
                      color: "#0075de",
                      backgroundColor: "rgba(0, 117, 222, 0.08)",
                      padding: "4px 12px",
                      borderRadius: theme.radii.full,
                      textTransform: "uppercase",
                    }}
                  >
                    Question 2
                  </span>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: theme.colors.ink,
                      lineHeight: 1.3,
                      maxWidth: 680,
                    }}
                  >
                    How does Raft guarantee leader completeness during election?
                  </div>
                </div>

                {/* Primary Card with 3D Y-Axis Flip & Dismissal */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    transformStyle: "preserve-3d",
                    transform: `translateX(${cardDismissTranslateX}px) rotate(${cardDismissRotate}deg) rotateY(${cardRotateY}deg)`,
                    opacity: cardDismissOpacity,
                  }}
                >
                  {/* FRONT: Question Side */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backfaceVisibility: "hidden",
                      backgroundColor: "#ffffff",
                      borderRadius: 20,
                      border: `1px solid ${theme.colors.hairline}`,
                      boxShadow: `0 ${cardShadowLift}px 36px rgba(0,0,0,0.12)`,
                      padding: "36px 44px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      gap: 20,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: "0.4px",
                        color: "#0075de",
                        backgroundColor: "rgba(0, 117, 222, 0.08)",
                        padding: "4px 14px",
                        borderRadius: theme.radii.full,
                        textTransform: "uppercase",
                      }}
                    >
                      Question
                    </span>

                    <div
                      style={{
                        fontSize: 32,
                        fontWeight: 700,
                        color: theme.colors.ink,
                        lineHeight: 1.3,
                        maxWidth: 700,
                        letterSpacing: "-0.5px",
                      }}
                    >
                      In Raft, what triggers a leader election?
                    </div>

                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 500,
                        color: theme.colors.inkMuted,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 10,
                      }}
                    >
                      <RotateCcw size={16} />
                      <span>Flipping to reveal answer...</span>
                    </div>
                  </div>

                  {/* BACK: Answer Side */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      backgroundColor: "#ffffff",
                      borderRadius: 20,
                      border: "2px solid #1aae39",
                      boxShadow: `0 ${cardShadowLift}px 36px rgba(0,0,0,0.12)`,
                      padding: "36px 44px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      gap: 16,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: "0.4px",
                        color: "#1aae39",
                        backgroundColor: "rgba(26, 174, 57, 0.12)",
                        padding: "4px 14px",
                        borderRadius: theme.radii.full,
                        textTransform: "uppercase",
                      }}
                    >
                      Answer
                    </span>

                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: theme.colors.ink,
                        lineHeight: 1.35,
                        maxWidth: 720,
                        letterSpacing: "-0.4px",
                      }}
                    >
                      &ldquo;A follower&apos;s election timeout expires with no heartbeat
                      from the leader.&rdquo;
                    </div>

                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 500,
                        color: theme.colors.inkSecondary,
                        lineHeight: 1.3,
                        maxWidth: 650,
                      }}
                    >
                      Follower increments current term, votes for itself, and issues
                      RequestVote RPCs to all peers.
                    </div>
                  </div>
                </div>
              </div>

              {/* Rating Buttons 0-5 (appear at f120, staggered 2 frames) */}
              {frame >= 118 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    marginTop: 24,
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: theme.colors.inkSecondary,
                      marginRight: 6,
                    }}
                  >
                    Rate Recall:
                  </span>

                  {[
                    { val: "0", label: "Again", time: "< 1m" },
                    { val: "1", label: "Hard", time: "1d" },
                    { val: "2", label: "Good", time: "3d" },
                    { val: "3", label: "Good", time: "4d" },
                    { val: "4", label: "Easy", time: "6d" },
                    { val: "5", label: "Perfect", time: "8d" },
                  ].map((btn, idx) => {
                    const btnStartF = 120 + idx * 2;
                    const btnProg = interpolate(
                      frame,
                      [btnStartF, btnStartF + 6],
                      [0, 1],
                      {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                        easing: easings.pop,
                      }
                    );

                    const isTarget = btn.val === "4";
                    const isPressed = isTarget && isBtn4Pressed;

                    return (
                      <div
                        key={btn.val}
                        style={{
                          transform: `scale(${btnProg * (isPressed ? 0.94 : 1)})`,
                          opacity: btnProg,
                          backgroundColor: isTarget
                            ? "#0075de"
                            : "#ffffff",
                          color: isTarget ? "#ffffff" : theme.colors.ink,
                          border: `1px solid ${
                            isTarget ? "#0075de" : theme.colors.hairline
                          }`,
                          borderRadius: 12,
                          padding: "8px 18px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 2,
                          boxShadow: isTarget
                            ? "0 4px 12px rgba(0, 117, 222, 0.35)"
                            : "0 2px 6px rgba(0,0,0,0.04)",
                        }}
                      >
                        <span style={{ fontSize: 20, fontWeight: 700 }}>
                          {btn.val}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: isTarget
                              ? "rgba(255, 255, 255, 0.85)"
                              : theme.colors.inkMuted,
                          }}
                        >
                          {btn.label} ({btn.time})
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </BrowserWindow>

        {/* FakeCursor interacting with Open Review Queue & Rating Button 4 */}
        <FakeCursor keyframes={cursorKeyframes} />
      </div>
    </AbsoluteFill>
  );
};
