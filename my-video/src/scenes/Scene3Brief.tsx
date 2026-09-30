import React from "react";
import {
  AbsoluteFill,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  Sparkles,
  Plus,
  Check,
  Calendar,
  Clock,
  Flame,
  FileText,
  Target,
  Wallet,
  CheckCircle2,
  Bell,
  ArrowRight,
} from "lucide-react";
import { Caption } from "../components/Caption";
import { BrowserWindow } from "../components/BrowserWindow";
import { easings } from "../motion";
import { theme } from "../theme";

export const SCENE_3_DURATION = 180; // 6 seconds at 30 fps

export const Scene3Brief: React.FC = () => {
  const frame = useCurrentFrame();

  // Slow camera push-in: scale 1.00 -> 1.05 over the scene, no rotation
  const cameraScale = interpolate(frame, [0, SCENE_3_DURATION], [1.0, 1.05], {
    extrapolateRight: "clamp",
  });

  // f0-40: Phone-style notification banner entry
  const bannerDropProg = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });
  const bannerTranslateY = interpolate(bannerDropProg, [0, 1], [-180, 0]);
  const bannerOpacityIn = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // f40-60: Banner scales up & morphs into BrowserWindow
  const morphProg = interpolate(frame, [40, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });

  const bannerFadeOut = interpolate(morphProg, [0, 0.5], [1, 0]);
  const bannerMorphScale = interpolate(morphProg, [0, 0.6], [1, 1.35]);

  const windowFadeIn = interpolate(morphProg, [0.15, 0.85], [0, 1]);
  const windowMorphScale = interpolate(morphProg, [0, 1], [0.93, 1]);

  // Choreography inside DailySummaryCard:
  // f60: Priority 1 pop
  const p1Scale = interpolate(frame, [60, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.pop,
  });
  const p1Opacity = interpolate(frame, [60, 66], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // f75: Priority 2 pop
  const p2Scale = interpolate(frame, [75, 85], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.pop,
  });
  const p2Opacity = interpolate(frame, [75, 81], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // f90: Priority 3 pop
  const p3Scale = interpolate(frame, [90, 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.pop,
  });
  const p3Opacity = interpolate(frame, [90, 96], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // f105: Yesterday's Wins column entrance
  const winsProg = interpolate(frame, [105, 118], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });
  const winsTranslateY = interpolate(winsProg, [0, 1], [18, 0]);

  // f120: Today's Flow column entrance
  const flowProg = interpolate(frame, [120, 133], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });
  const flowTranslateY = interpolate(flowProg, [0, 1], [18, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.canvasSoft,
        fontFamily: theme.fontFamily,
        overflow: "hidden",
      }}
    >
      {/* Top Center Caption: "Wake up to a plan." at f10 */}
      <Caption text="Wake up to a plan." startFrame={10} duration={170} />

      {/* Camera push-in container */}
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transform: `scale(${cameraScale})`,
          transformOrigin: "center 520px",
        }}
      >
        {/* ============================================================ */}
        {/* f0-45: Phone-style Notification Banner (Center screen) */}
        {/* ============================================================ */}
        {frame < 52 && (
          <div
            style={{
              position: "absolute",
              top: 240,
              left: "50%",
              transform: `translateX(-50%) translateY(${bannerTranslateY}px) scale(${bannerMorphScale})`,
              width: 580,
              backgroundColor: "#ffffff",
              borderRadius: 24,
              border: `1px solid ${theme.colors.hairline}`,
              boxShadow: "0 18px 45px rgba(0,0,0,0.16)",
              padding: "18px 24px",
              display: "flex",
              alignItems: "center",
              gap: 18,
              opacity: bannerOpacityIn * bannerFadeOut,
              zIndex: 60,
              userSelect: "none",
            }}
          >
            {/* LifeOS App Icon */}
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 14,
                backgroundColor: "#f6f5f4",
                border: `1px solid ${theme.colors.hairline}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <img
                src={staticFile("video-assets/logo-ribbon-transparent.png")}
                alt="LifeOS"
                style={{ width: 44, height: 32, objectFit: "contain" }}
              />
            </div>

            {/* Notification Text Body */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: theme.colors.ink,
                      letterSpacing: "-0.2px",
                    }}
                  >
                    LifeOS
                  </span>
                  <span style={{ fontSize: 13, color: theme.colors.inkMuted }}>•</span>
                  <span style={{ fontSize: 13, color: theme.colors.inkMuted, fontWeight: 500 }}>
                    Daily Briefing
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 14,
                    color: theme.colors.inkMuted,
                    fontWeight: 500,
                  }}
                >
                  7:00 AM
                </span>
              </div>

              <div
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  color: theme.colors.ink,
                  letterSpacing: "-0.4px",
                }}
              >
                Your Daily Summary is ready
              </div>

              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: theme.colors.inkSecondary,
                }}
              >
                Top 3 exam priorities queued for Nov 15
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* f40-180: BrowserWindow showing LifeOS Dashboard & DailySummary */}
        {/* ============================================================ */}
        {frame >= 40 && (
          <div
            style={{
              position: "absolute",
              top: 200,
              left: "50%",
              width: 1680,
              height: 800,
              transform: `translateX(-50%) scale(${windowMorphScale})`,
              opacity: windowFadeIn,
              zIndex: 40,
            }}
          >
            <BrowserWindow
              width="100%"
              height="100%"
              top={0}
              left="0%"
              title="LifeOS — Executive Hub"
              style={{
                boxShadow: theme.shadows.level3,
                borderRadius: 16,
              }}
              bodyStyle={{
                backgroundColor: theme.colors.canvasSoft,
              }}
            >
              {/* 1. Deep Indigo Hero Band (#213183) */}
              <div
                style={{
                  backgroundColor: "#213183",
                  padding: "26px 44px 72px 44px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  color: "#ffffff",
                  position: "relative",
                }}
              >
                {/* Hero Header Row: Greeting & Quick Action Pills */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "rgba(255, 255, 255, 0.72)",
                        letterSpacing: "0.4px",
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      LifeOS Executive Hub • 7:00 AM
                    </div>
                    <div
                      style={{
                        fontSize: 38,
                        fontWeight: 700,
                        color: "#ffffff",
                        letterSpacing: "-1.2px",
                        lineHeight: 1.1,
                      }}
                    >
                      Good morning, Aarav
                    </div>
                  </div>

                  {/* Quick Action Pills */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        backgroundColor: "rgba(255, 255, 255, 0.12)",
                        border: "1px solid rgba(255, 255, 255, 0.22)",
                        borderRadius: theme.radii.full,
                        padding: "8px 16px",
                        color: "#ffffff",
                        fontSize: 16,
                        fontWeight: 600,
                      }}
                    >
                      <Plus size={16} strokeWidth={2.4} />
                      <span>Note</span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        backgroundColor: "rgba(255, 255, 255, 0.12)",
                        border: "1px solid rgba(255, 255, 255, 0.22)",
                        borderRadius: theme.radii.full,
                        padding: "8px 16px",
                        color: "#ffffff",
                        fontSize: 16,
                        fontWeight: 600,
                      }}
                    >
                      <Plus size={16} strokeWidth={2.4} />
                      <span>Habit</span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        backgroundColor: "rgba(255, 255, 255, 0.12)",
                        border: "1px solid rgba(255, 255, 255, 0.22)",
                        borderRadius: theme.radii.full,
                        padding: "8px 16px",
                        color: "#ffffff",
                        fontSize: 16,
                        fontWeight: 600,
                      }}
                    >
                      <Plus size={16} strokeWidth={2.4} />
                      <span>Goal</span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        backgroundColor: "rgba(255, 255, 255, 0.12)",
                        border: "1px solid rgba(255, 255, 255, 0.22)",
                        borderRadius: theme.radii.full,
                        padding: "8px 16px",
                        color: "#ffffff",
                        fontSize: 16,
                        fontWeight: 600,
                      }}
                    >
                      <Plus size={16} strokeWidth={2.4} />
                      <span>Expense</span>
                    </div>

                    {/* AI Assistant Pill */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: "linear-gradient(135deg, #0080ff 0%, #00d2ff 100%)",
                        borderRadius: theme.radii.full,
                        padding: "8px 20px",
                        color: "#ffffff",
                        fontSize: 16,
                        fontWeight: 700,
                        boxShadow: "0 4px 14px rgba(0, 128, 255, 0.4)",
                      }}
                    >
                      <Sparkles size={17} strokeWidth={2.4} />
                      <span>AI Assistant</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. DailySummaryCard Overlapping the Hero Band */}
              <div
                style={{
                  position: "relative",
                  marginTop: -52,
                  marginLeft: 40,
                  marginRight: 40,
                  backgroundColor: "#ffffff",
                  borderRadius: 20,
                  border: `1px solid ${theme.colors.hairline}`,
                  boxShadow: "0 14px 34px rgba(0,0,0,0.10)",
                  padding: "26px 36px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 22,
                }}
              >
                {/* Card Title Row with Pending Habit Status */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingBottom: 16,
                    borderBottom: `1px solid ${theme.colors.hairline}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        backgroundColor: "#0075de",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 26,
                        fontWeight: 700,
                        color: theme.colors.ink,
                        letterSpacing: "-0.6px",
                      }}
                    >
                      Daily Summary — Generated for Today (07:00 AM)
                    </span>
                  </div>

                  {/* Habit status: Pending (7:00 AM) */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      backgroundColor: "rgba(221, 91, 0, 0.10)",
                      border: "1px solid rgba(221, 91, 0, 0.3)",
                      borderRadius: theme.radii.full,
                      padding: "6px 16px",
                    }}
                  >
                    <Flame size={18} color="#dd5b00" strokeWidth={2.4} />
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#dd5b00",
                        letterSpacing: "-0.2px",
                      }}
                    >
                      4 Habits Pending • 0/4 Done (7:00 AM)
                    </span>
                  </div>
                </div>

                {/* 3 Columns Layout: Min 22px body text for 1080p legibility */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.25fr 1fr 1fr",
                    gap: 36,
                  }}
                >
                  {/* ======================================================== */}
                  {/* Column 1: Top 3 Priorities (Badges pop at f60, f75, f90) */}
                  {/* ======================================================== */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    <div
                      style={{
                        fontSize: 26,
                        fontWeight: 700,
                        color: theme.colors.ink,
                        letterSpacing: "-0.4px",
                      }}
                    >
                      Top 3 Priorities
                    </div>

                    {/* Priority 1 */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 16,
                        opacity: p1Opacity,
                      }}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          backgroundColor: "#0075de",
                          color: "#ffffff",
                          fontSize: 24,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transform: `scale(${p1Scale})`,
                          boxShadow: "0 3px 8px rgba(0, 117, 222, 0.35)",
                        }}
                      >
                        1
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: theme.colors.ink,
                            lineHeight: 1.25,
                            letterSpacing: "-0.3px",
                          }}
                        >
                          Master Raft Leader Election
                        </div>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 500,
                            color: theme.colors.inkSecondary,
                            lineHeight: 1.3,
                          }}
                        >
                          Topic due in 3 days • highest syllabus weight
                        </div>
                      </div>
                    </div>

                    {/* Priority 2 */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 16,
                        opacity: p2Opacity,
                      }}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          backgroundColor: "#0075de",
                          color: "#ffffff",
                          fontSize: 24,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transform: `scale(${p2Scale})`,
                          boxShadow: "0 3px 8px rgba(0, 117, 222, 0.35)",
                        }}
                      >
                        2
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: theme.colors.ink,
                            lineHeight: 1.25,
                            letterSpacing: "-0.3px",
                          }}
                        >
                          Clear 18 Spaced Flashcards
                        </div>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 500,
                            color: theme.colors.inkSecondary,
                            lineHeight: 1.3,
                          }}
                        >
                          Optimal SM-2 review threshold reached
                        </div>
                      </div>
                    </div>

                    {/* Priority 3 */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 16,
                        opacity: p3Opacity,
                      }}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          backgroundColor: "#0075de",
                          color: "#ffffff",
                          fontSize: 24,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transform: `scale(${p3Scale})`,
                          boxShadow: "0 3px 8px rgba(0, 117, 222, 0.35)",
                        }}
                      >
                        3
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: theme.colors.ink,
                            lineHeight: 1.25,
                            letterSpacing: "-0.3px",
                          }}
                        >
                          Protect 2h Deep Work Window
                        </div>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 500,
                            color: theme.colors.inkSecondary,
                            lineHeight: 1.3,
                          }}
                        >
                          Maintain 8-day consistency streak
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ======================================================== */}
                  {/* Column 2: Yesterday's Wins (Enters at f105) */}
                  {/* ======================================================== */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 18,
                      opacity: winsProg,
                      transform: `translateY(${winsTranslateY}px)`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 26,
                        fontWeight: 700,
                        color: theme.colors.ink,
                        letterSpacing: "-0.4px",
                      }}
                    >
                      Yesterday&apos;s Wins
                    </div>

                    {/* Win 1 */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          backgroundColor: "rgba(26, 174, 57, 0.14)",
                          color: "#1aae39",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        <Check size={22} strokeWidth={2.8} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 600,
                            color: theme.colors.ink,
                            lineHeight: 1.25,
                            letterSpacing: "-0.3px",
                          }}
                        >
                          Consistent Hashing Topic
                        </div>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 500,
                            color: theme.colors.inkSecondary,
                          }}
                        >
                          45m focus session completed
                        </div>
                      </div>
                    </div>

                    {/* Win 2 */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          backgroundColor: "rgba(26, 174, 57, 0.14)",
                          color: "#1aae39",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        <Check size={22} strokeWidth={2.8} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 600,
                            color: theme.colors.ink,
                            lineHeight: 1.25,
                            letterSpacing: "-0.3px",
                          }}
                        >
                          Solved 2 DP Problems
                        </div>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 500,
                            color: theme.colors.inkSecondary,
                          }}
                        >
                          LeetCode 14-day streak active
                        </div>
                      </div>
                    </div>

                    {/* Win 3 */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          backgroundColor: "rgba(26, 174, 57, 0.14)",
                          color: "#1aae39",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        <Check size={22} strokeWidth={2.8} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 600,
                            color: theme.colors.ink,
                            lineHeight: 1.25,
                            letterSpacing: "-0.3px",
                          }}
                        >
                          Morning 3 km Run
                        </div>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 500,
                            color: theme.colors.inkSecondary,
                          }}
                        >
                          5-day streak milestone
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ======================================================== */}
                  {/* Column 3: Today's Flow (Enters at f120) */}
                  {/* ======================================================== */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 18,
                      opacity: flowProg,
                      transform: `translateY(${flowTranslateY}px)`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 26,
                        fontWeight: 700,
                        color: theme.colors.ink,
                        letterSpacing: "-0.4px",
                      }}
                    >
                      Today&apos;s Flow
                    </div>

                    {/* Event 1 */}
                    <div
                      style={{
                        backgroundColor: "#f6f5f4",
                        borderRadius: theme.radii.md,
                        border: `1px solid ${theme.colors.hairline}`,
                        padding: "12px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#0075de",
                          letterSpacing: "0.2px",
                        }}
                      >
                        09:00 AM • LECTURE
                      </div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 600,
                          color: theme.colors.ink,
                          lineHeight: 1.25,
                          letterSpacing: "-0.3px",
                        }}
                      >
                        Distributed Systems (Hall 302)
                      </div>
                    </div>

                    {/* Event 2 */}
                    <div
                      style={{
                        backgroundColor: "#f6f5f4",
                        borderRadius: theme.radii.md,
                        border: `1px solid ${theme.colors.hairline}`,
                        padding: "12px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#213183",
                          letterSpacing: "0.2px",
                        }}
                      >
                        02:00 PM • DEEP WORK
                      </div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 600,
                          color: theme.colors.ink,
                          lineHeight: 1.25,
                          letterSpacing: "-0.3px",
                        }}
                      >
                        Raft Consensus Paper Analysis
                      </div>
                    </div>

                    {/* Event 3 */}
                    <div
                      style={{
                        backgroundColor: "#f6f5f4",
                        borderRadius: theme.radii.md,
                        border: `1px solid ${theme.colors.hairline}`,
                        padding: "12px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#dd5b00",
                          letterSpacing: "0.2px",
                        }}
                      >
                        05:00 PM • STUDY GROUP
                      </div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 600,
                          color: theme.colors.ink,
                          lineHeight: 1.25,
                          letterSpacing: "-0.3px",
                        }}
                      >
                        Algorithm Study Group (Library 4B)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </BrowserWindow>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
