import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import {
  Sparkles,
  Flame,
  Check,
  CheckSquare,
  Clock,
  Zap,
  Wallet,
  Coffee,
  FileText,
  Bookmark,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { Caption } from "../components/Caption";
import { BrowserWindow } from "../components/BrowserWindow";
import { FakeCursor } from "../components/FakeCursor";
import { easings } from "../motion";
import { theme } from "../theme";

export const SCENE_6_DURATION = 180; // 4 mini-scenes x 45 frames = 180 frames (6s at 30 fps)

export const Scene6Montage: React.FC = () => {
  const frame = useCurrentFrame();

  // Determine current active mini-scene
  const isFocus = frame >= 0 && frame < 45;
  const isHabits = frame >= 45 && frame < 90;
  const isFinance = frame >= 90 && frame < 135;
  const isNotes = frame >= 135 && frame < 180;

  // ============================================================
  // MINI-SCENE A: FOCUS (f0 - f45)
  // ============================================================
  // Dial sweep: 0 -> 20% progress over f5 - f45
  const focusElapsed = interpolate(frame, [5, 42], [0, 0.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });
  // Time-lapse countdown from 25:00 down to 20:00
  const focusMinutes = Math.round(
    interpolate(frame, [5, 42], [25, 20], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const focusSeconds = 0;
  // Dial stroke dash: circumference = 2 * PI * 96 ≈ 603
  const dialCircumference = 603;
  const dialDashoffset = dialCircumference * (1 - focusElapsed);

  // Soft blue aura pulse: sinusoidal glow
  const auraGlow = 0.25 + 0.15 * Math.sin((frame / 30) * Math.PI * 2);

  // ============================================================
  // MINI-SCENE B: HABITS (f45 - f90)
  // ============================================================
  const habitLocalF = frame - 45; // 0 to 44
  // Click happens at local frame 16 (global f61)
  const isHabitClicked = habitLocalF >= 16;

  // Check pop: scale 0.8 -> 1.28 -> 1.0 (local frame 16 to 24)
  const checkPopScale = interpolate(
    habitLocalF,
    [16, 20, 24],
    [0.8, 1.28, 1.0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // Flame wobble: +-6 degrees around local frame 16-28
  const flameWobble =
    habitLocalF >= 16 && habitLocalF < 28
      ? Math.sin((habitLocalF - 16) * 0.9) * 6
      : 0;

  // Counter roll: 21 -> 22 at local frame 16
  const streakCount = isHabitClicked ? 22 : 21;

  // Cursor for habit click: Mark Done button is at x: 1105, y: 470 in container space
  const habitCursorKeyframes = [
    { frame: 45, x: 1250, y: 620 },
    { frame: 58, x: 1105, y: 470 },
    { frame: 61, x: 1105, y: 470, click: true }, // click Mark Done at f61
    { frame: 70, x: 1120, y: 480 },
    { frame: 85, x: 1220, y: 560 },
  ];

  // ============================================================
  // MINI-SCENE C: FINANCE (f90 - f135)
  // ============================================================
  const finLocalF = frame - 90; // 0 to 44
  // Progress bar fills left to right: from 66.7% (Rs 8,000) to 70.4% (Rs 8,450)
  const finFillPercent = interpolate(finLocalF, [8, 24], [66.7, 70.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });
  // Amount counts up from Rs 8,000 to Rs 8,450
  const finAmount = Math.round(
    interpolate(finLocalF, [8, 24], [8000, 8450], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  // Bar color: shifts from #0075de to #dd5b00 as it crosses 70% (at finAmount >= 8400)
  const isOver70 = finAmount >= 8400;
  const barColor = isOver70 ? "#dd5b00" : "#0075de";

  // Ledger row slide-in from bottom: local frame 6 to 18 (global f96 - f108)
  const ledgerSlideProg = interpolate(finLocalF, [6, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });
  const ledgerTranslateY = interpolate(ledgerSlideProg, [0, 1], [30, 0]);

  // ============================================================
  // MINI-SCENE D: NOTES (f135 - f180)
  // ============================================================
  const notesLocalF = frame - 135; // 0 to 44
  // Title typewriter: "Raft: Leader Election" (21 chars over local frames 2 - 14)
  const fullNotesTitle = "Raft: Leader Election";
  const notesCharCount = Math.floor(
    interpolate(notesLocalF, [2, 14], [0, fullNotesTitle.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const typedNotesTitle = fullNotesTitle.slice(0, notesCharCount);

  // Bullets fade-in sequentially
  const b1Opacity = interpolate(notesLocalF, [8, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const b2Opacity = interpolate(notesLocalF, [12, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const b3Opacity = interpolate(notesLocalF, [16, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Checklist item checked at local frame 20 (global f155)
  const isNotesChecklistChecked = notesLocalF >= 20;

  // Green "Saved" pill pop-in at local frame 21 (global f156)
  const savedPillProg = interpolate(notesLocalF, [21, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.pop,
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.canvasSoft,
        fontFamily: theme.fontFamily,
        overflow: "hidden",
      }}
    >
      {/* 4 Hard-cut Rhythmic Captions (Each exactly 45 frames) */}
      {isFocus && <Caption text="Focus on the topic." startFrame={0} duration={45} />}
      {isHabits && <Caption text="Keep the streak." startFrame={45} duration={45} />}
      {isFinance && <Caption text="Stay on budget." startFrame={90} duration={45} />}
      {isNotes && <Caption text="Capture it all." startFrame={135} duration={45} />}

      {/* Same BrowserWindow Framing throughout all cuts (no camera zoom) */}
      <BrowserWindow
        width={1680}
        height={800}
        top={200}
        left="50%"
        title={
          isFocus
            ? "LifeOS — Focus & Pomodoro"
            : isHabits
            ? "LifeOS — Habits & Routines"
            : isFinance
            ? "LifeOS — Finance & Budgeting"
            : "LifeOS — Notes & Knowledge Base"
        }
        style={{
          borderRadius: 16,
          boxShadow: theme.shadows.level3,
        }}
        bodyStyle={{
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* ============================================================ */}
        {/* MINI-SCENE A: FOCUS (f0 - f45) */}
        {/* ============================================================ */}
        {isFocus && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#faf9f8",
              padding: "24px 40px",
              position: "relative",
            }}
          >
            {/* Eyebrow Label */}
            <div
              style={{
                position: "absolute",
                top: 24,
                left: 36,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "1.5px",
                color: "#0075de",
                textTransform: "uppercase",
              }}
            >
              FOCUS
            </div>

            {/* Central Focus Card */}
            <div
              style={{
                width: 720,
                backgroundColor: "#ffffff",
                borderRadius: 20,
                border: `1px solid ${theme.colors.hairline}`,
                boxShadow: `0 16px 40px rgba(0, 117, 222, ${auraGlow})`,
                padding: "28px 36px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
              }}
            >
              {/* Card Header: "Deep Work" pill, "Cycle 1/4" dots, work-interval badge */}
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {/* Deep Work Pill */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "linear-gradient(135deg, #0080ff 0%, #00d2ff 100%)",
                    color: "#ffffff",
                    borderRadius: theme.radii.full,
                    padding: "6px 16px",
                    fontSize: 15,
                    fontWeight: 700,
                    boxShadow: "0 2px 8px rgba(0, 128, 255, 0.3)",
                  }}
                >
                  <Sparkles size={16} strokeWidth={2.4} />
                  <span>Deep Work</span>
                </div>

                {/* Cycle 1/4 Dots */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: theme.colors.inkSecondary }}>
                    Cycle 1/4
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: "#0075de",
                      }}
                    />
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: "#e0dedb",
                      }}
                    />
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: "#e0dedb",
                      }}
                    />
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: "#e0dedb",
                      }}
                    />
                  </div>
                </div>

                {/* Work Interval Badge */}
                <div
                  style={{
                    backgroundColor: "rgba(26, 174, 57, 0.12)",
                    border: "1px solid rgba(26, 174, 57, 0.3)",
                    color: "#1aae39",
                    borderRadius: theme.radii.full,
                    padding: "6px 14px",
                    fontSize: 14,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Zap size={14} color="#1aae39" strokeWidth={2.5} />
                  <span>Work Interval</span>
                </div>
              </div>

              {/* Large 25:00 Circular Dial */}
              <div
                style={{
                  position: "relative",
                  width: 240,
                  height: 240,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* SVG Progress Ring */}
                <svg
                  width={240}
                  height={240}
                  viewBox="0 0 240 240"
                  style={{ transform: "rotate(-90deg)" }}
                >
                  {/* Background Track */}
                  <circle
                    cx={120}
                    cy={120}
                    r={96}
                    fill="none"
                    stroke="#f0eeeb"
                    strokeWidth={12}
                  />
                  {/* Clockwise Progress Sweep */}
                  <circle
                    cx={120}
                    cy={120}
                    r={96}
                    fill="none"
                    stroke="#0075de"
                    strokeWidth={12}
                    strokeDasharray={dialCircumference}
                    strokeDashoffset={dialDashoffset}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Centered Countdown Digits */}
                <div
                  style={{
                    position: "absolute",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 54,
                      fontWeight: 700,
                      color: theme.colors.ink,
                      letterSpacing: "-2px",
                      fontVariantNumeric: "tabular-nums",
                      lineHeight: 1,
                    }}
                  >
                    {String(focusMinutes).padStart(2, "0")}:
                    {String(focusSeconds).padStart(2, "0")}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#0075de",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                    }}
                  >
                    STAY FOCUSED
                  </span>
                </div>
              </div>

              {/* Linked-Topic Chip */}
              <div
                style={{
                  backgroundColor: "#f6f5f4",
                  borderRadius: theme.radii.full,
                  border: `1px solid ${theme.colors.hairline}`,
                  padding: "8px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Bookmark size={16} color="#0075de" />
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: theme.colors.ink,
                  }}
                >
                  Topic: Raft &amp; Paxos Consensus Protocols
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MINI-SCENE B: HABITS (f45 - f90) */}
        {/* ============================================================ */}
        {isHabits && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#faf9f8",
              padding: "24px 40px",
              position: "relative",
            }}
          >
            {/* Eyebrow Label */}
            <div
              style={{
                position: "absolute",
                top: 24,
                left: 36,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "1.5px",
                color: "#dd5b00",
                textTransform: "uppercase",
              }}
            >
              HABITS
            </div>

            {/* Habit Card Container */}
            <div
              style={{
                width: 760,
                backgroundColor: "#ffffff",
                borderRadius: 20,
                border: `1px solid ${theme.colors.hairline}`,
                boxShadow: "0 12px 32px rgba(0,0,0,0.06)",
                padding: "32px 40px",
                display: "flex",
                flexDirection: "column",
                gap: 24,
              }}
            >
              {/* Habit Header & Streak */}
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
                      fontSize: 26,
                      fontWeight: 700,
                      color: theme.colors.ink,
                      letterSpacing: "-0.5px",
                    }}
                  >
                    Review Due Flashcards
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: theme.colors.inkSecondary,
                      marginTop: 2,
                    }}
                  >
                    Daily • 95% completion rate
                  </div>
                </div>

                {/* Streak Badge with Flame Icon */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: "rgba(221, 91, 0, 0.12)",
                    border: "1px solid rgba(221, 91, 0, 0.3)",
                    borderRadius: theme.radii.full,
                    padding: "8px 18px",
                  }}
                >
                  <div style={{ transform: `rotate(${flameWobble}deg)` }}>
                    <Flame size={22} color="#dd5b00" strokeWidth={2.4} />
                  </div>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#dd5b00",
                      letterSpacing: "-0.2px",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {streakCount}-day streak
                  </span>
                </div>
              </div>

              {/* Trailing 7-Day Matrix */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: theme.colors.inkSecondary,
                  }}
                >
                  Trailing 7 Days:
                </span>
                <div style={{ display: "flex", gap: 14 }}>
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"].map(
                    (day, i) => {
                      const isToday = i === 6;
                      const isChecked = isToday ? isHabitClicked : true;

                      return (
                        <div
                          key={day}
                          style={{
                            flex: 1,
                            backgroundColor: isChecked
                              ? "rgba(26, 174, 57, 0.14)"
                              : "#f6f5f4",
                            border: `2px solid ${
                              isChecked
                                ? "#1aae39"
                                : isToday
                                ? "#0075de"
                                : theme.colors.hairline
                            }`,
                            borderRadius: 12,
                            padding: "12px 8px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: theme.colors.inkSecondary,
                            }}
                          >
                            {day}
                          </span>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              backgroundColor: isChecked
                                ? "#1aae39"
                                : "transparent",
                              border: isChecked
                                ? "none"
                                : isToday
                                ? "2px dashed #0075de"
                                : "2px solid #e0dedb",
                              boxSizing: "border-box",
                              color: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transform:
                                isToday && isHabitClicked
                                  ? `scale(${checkPopScale})`
                                  : "scale(1)",
                            }}
                          >
                            {isChecked && <Check size={18} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Action Button & Heat Grid Preview */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 12,
                  borderTop: `1px solid ${theme.colors.hairline}`,
                }}
              >
                {/* 60-day interactive heat-grid snippet */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {Array.from({ length: 12 }).map((_, cIdx) => (
                      <div
                        key={cIdx}
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 3,
                          backgroundColor:
                            cIdx === 11 && isHabitClicked
                              ? "#1aae39"
                              : cIdx === 11
                              ? "#f0eeeb"
                              : "#1aae39",
                          opacity: cIdx === 11 && !isHabitClicked ? 0.4 : 0.85,
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: 13, color: theme.colors.inkMuted }}>
                    60-day view
                  </span>
                </div>

                {/* Mark Done Button */}
                <div
                  style={{
                    backgroundColor: isHabitClicked ? "#1aae39" : "#0075de",
                    color: "#ffffff",
                    borderRadius: 10,
                    padding: "10px 24px",
                    fontSize: 16,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: isHabitClicked
                      ? "0 4px 12px rgba(26, 174, 57, 0.35)"
                      : "0 4px 12px rgba(0, 117, 222, 0.35)",
                  }}
                >
                  <Check size={18} strokeWidth={2.8} />
                  <span>{isHabitClicked ? "Completed" : "Mark Done"}</span>
                </div>
              </div>
            </div>

            {/* FakeCursor for Habits */}
            <FakeCursor keyframes={habitCursorKeyframes} />
          </div>
        )}

        {/* ============================================================ */}
        {/* MINI-SCENE C: FINANCE (f90 - f135) */}
        {/* ============================================================ */}
        {isFinance && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#faf9f8",
              padding: "24px 40px",
              position: "relative",
            }}
          >
            {/* Eyebrow Label */}
            <div
              style={{
                position: "absolute",
                top: 24,
                left: 36,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "1.5px",
                color: "#1aae39",
                textTransform: "uppercase",
              }}
            >
              FINANCE
            </div>

            {/* Budget & Ledger Card */}
            <div
              style={{
                width: 780,
                backgroundColor: "#ffffff",
                borderRadius: 20,
                border: `1px solid ${theme.colors.hairline}`,
                boxShadow: "0 12px 32px rgba(0,0,0,0.06)",
                padding: "32px 40px",
                display: "flex",
                flexDirection: "column",
                gap: 22,
              }}
            >
              {/* Budget Title & Total Ratio */}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: theme.colors.ink,
                      letterSpacing: "-0.5px",
                    }}
                  >
                    Monthly Student Budget
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: theme.colors.inkSecondary,
                      marginTop: 2,
                    }}
                  >
                    Overall spending cap &bull; 46 days to exams
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: isOver70 ? "#dd5b00" : "#111827",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    Rs {finAmount.toLocaleString()}
                  </span>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: theme.colors.inkMuted,
                      marginLeft: 4,
                    }}
                  >
                    / Rs 12,000
                  </span>
                </div>
              </div>

              {/* Progress Bar with Color Shift at 70% */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    height: 14,
                    backgroundColor: "#f0eeeb",
                    borderRadius: 99,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${finFillPercent}%`,
                      backgroundColor: barColor,
                      borderRadius: 99,
                    }}
                  />
                  {/* 70% Threshold Marker */}
                  <div
                    style={{
                      position: "absolute",
                      left: "70%",
                      top: 0,
                      bottom: 0,
                      width: 2,
                      backgroundColor: "#111827",
                      opacity: 0.35,
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 14,
                    fontWeight: 600,
                    color: theme.colors.inkSecondary,
                  }}
                >
                  <span>Spent: {Math.round(finFillPercent)}%</span>
                  <span style={{ color: isOver70 ? "#dd5b00" : theme.colors.inkSecondary }}>
                    {isOver70 ? "Approaching monthly limit (70%)" : "On track"}
                  </span>
                </div>
              </div>

              {/* Ledger Transaction Sliding In */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  marginTop: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: theme.colors.inkSecondary,
                  }}
                >
                  Recent Transactions:
                </span>

                {/* Sliding In: Study Coffee & Snacks Rs 450 */}
                <div
                  style={{
                    backgroundColor: "#f6f5f4",
                    borderRadius: 12,
                    border: `1px solid ${theme.colors.hairline}`,
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transform: `translateY(${ledgerTranslateY}px)`,
                    opacity: ledgerSlideProg,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: "rgba(221, 91, 0, 0.12)",
                        color: "#dd5b00",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Coffee size={20} strokeWidth={2.4} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: theme.colors.ink,
                        }}
                      >
                        Study Coffee &amp; Snacks
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: theme.colors.inkMuted,
                        }}
                      >
                        Food &amp; Cafe &bull; Campus Cafe &bull; Receipt OCR
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#dd5b00",
                    }}
                  >
                    - Rs 450
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MINI-SCENE D: NOTES (f135 - f180) */}
        {/* ============================================================ */}
        {isNotes && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#ffffff",
              padding: "28px 48px",
              position: "relative",
            }}
          >
            {/* Eyebrow Label & Editor Toolbar Row */}
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
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: "1.5px",
                    color: "#b8127f",
                    textTransform: "uppercase",
                  }}
                >
                  NOTES
                </span>
                <span style={{ fontSize: 14, color: theme.colors.inkMuted }}>
                  &bull;
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0075de",
                    backgroundColor: "rgba(0, 117, 222, 0.08)",
                    padding: "3px 10px",
                    borderRadius: theme.radii.full,
                  }}
                >
                  Distributed Systems / Exam Review
                </span>
              </div>

              {/* Green "Saved" Pill */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: "rgba(26, 174, 57, 0.12)",
                  border: "1px solid rgba(26, 174, 57, 0.3)",
                  color: "#1aae39",
                  borderRadius: theme.radii.full,
                  padding: "5px 14px",
                  fontSize: 14,
                  fontWeight: 700,
                  transform: `scale(${savedPillProg})`,
                  opacity: savedPillProg,
                }}
              >
                <Check size={16} strokeWidth={2.8} />
                <span>Saved</span>
              </div>
            </div>

            {/* Document Editor Area */}
            <div
              style={{
                paddingTop: 24,
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              {/* Note Title (Typewriter) */}
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  color: theme.colors.ink,
                  letterSpacing: "-0.8px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <span>{typedNotesTitle}</span>
                {notesLocalF < 22 && (
                  <span
                    style={{
                      color: "#0075de",
                      fontWeight: 700,
                      marginLeft: 2,
                    }}
                  >
                    |
                  </span>
                )}
              </div>

              {/* 3 Bullet Points */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  fontSize: 22,
                  lineHeight: 1.4,
                  color: theme.colors.ink,
                }}
              >
                <div style={{ opacity: b1Opacity }}>
                  &bull; Split votes handled via randomized election timeouts
                  (150ms&ndash;300ms)
                </div>
                <div style={{ opacity: b2Opacity }}>
                  &bull; Candidate must win majority (N/2 + 1) of cluster votes
                </div>
                <div style={{ opacity: b3Opacity }}>
                  &bull; Heartbeat AppendEntries RPCs suppress new elections
                </div>
              </div>

              {/* Checklist Item */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 10,
                  backgroundColor: "#f6f5f4",
                  borderRadius: 10,
                  padding: "12px 18px",
                  border: `1px solid ${theme.colors.hairline}`,
                  fontSize: 20,
                  fontWeight: 600,
                  color: isNotesChecklistChecked
                    ? theme.colors.inkMuted
                    : theme.colors.ink,
                  textDecoration: isNotesChecklistChecked
                    ? "line-through"
                    : "none",
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    backgroundColor: isNotesChecklistChecked
                      ? "#1aae39"
                      : "#ffffff",
                    border: `2px solid ${
                      isNotesChecklistChecked ? "#1aae39" : "#a1a1aa"
                    }`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                  }}
                >
                  {isNotesChecklistChecked && (
                    <Check size={16} strokeWidth={3} />
                  )}
                </div>
                <span>Verify term increment logic in follower state</span>
              </div>
            </div>
          </div>
        )}
      </BrowserWindow>
    </AbsoluteFill>
  );
};
