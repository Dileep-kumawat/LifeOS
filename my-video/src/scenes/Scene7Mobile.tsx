import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import {
  Globe,
  Smartphone,
  LayoutDashboard,
  Flame,
  GraduationCap,
  Wallet,
  FileText,
  Sparkles,
  Check,
  CheckCircle2,
  Clock,
  ChevronRight,
  Zap,
  BookOpen,
  Calendar,
  Layers,
} from "lucide-react";
import { Caption } from "../components/Caption";
import { PhoneFrame } from "../components/PhoneFrame";
import { easings } from "../motion";
import { theme } from "../theme";

export const SCENE_7_DURATION = 120; // 4 seconds at 30 fps

export const Scene7Mobile: React.FC = () => {
  const frame = useCurrentFrame();

  // ============================================================
  // Phone Entrance Animation (f0 - f10)
  // ============================================================
  const phoneTranslateY = interpolate(frame, [0, 10], [80, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });
  const phoneOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ============================================================
  // Dock & Page Lockstep Paging (f10 - f90)
  // Page 0: Dashboard (f10 - f32)
  // Page 1: Habits (f44 - f65)
  // Page 2: Study (f77 - f95)
  // ============================================================
  // Continuous dock step from 0 -> 1 -> 2
  const dockStep1 = interpolate(frame, [32, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.standard,
  });
  const dockStep2 = interpolate(frame, [65, 77], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.standard,
  });
  const currentDockIndex = dockStep1 + dockStep2; // 0 -> 1 -> 2

  // Screen content horizontal slide in lockstep (phone screen width = 416px)
  const phoneScreenWidth = 416;
  const pageTranslateX = -currentDockIndex * phoneScreenWidth;

  // Dock icon horizontal spacing = 68px
  const dockItemSpacing = 68;

  // Ephemeral floating label pill (fades in and out for each tab)
  // Tab 0: Dashboard (f10 - f30)
  const label0Opacity = interpolate(
    frame,
    [10, 16, 26, 32],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  // Tab 1: Habits (f42 - f64)
  const label1Opacity = interpolate(
    frame,
    [42, 48, 58, 65],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  // Tab 2: Study (f75 - f95)
  const label2Opacity = interpolate(
    frame,
    [75, 81, 95, 105],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Active label string based on progress
  const activeLabelText =
    currentDockIndex < 0.5
      ? "Dashboard"
      : currentDockIndex < 1.5
      ? "Habits"
      : "Study";
  const activeLabelOpacity =
    currentDockIndex < 0.5
      ? label0Opacity
      : currentDockIndex < 1.5
      ? label1Opacity
      : label2Opacity;

  // ============================================================
  // Right-side Stacked Labels: Web (f30) and Android (f45)
  // ============================================================
  const webOpacity = interpolate(frame, [30, 42], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const webTranslateY = interpolate(frame, [30, 42], [28, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });

  const androidOpacity = interpolate(frame, [45, 57], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const androidTranslateY = interpolate(frame, [45, 57], [28, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });

  // Dock icon definition with flanking icons on both sides
  const dockIcons = [
    { id: "focus", icon: Zap, label: "Focus" },
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "habits", icon: Flame, label: "Habits" },
    { id: "study", icon: GraduationCap, label: "Study" },
    { id: "finance", icon: Wallet, label: "Finance" },
    { id: "notes", icon: FileText, label: "Notes" },
  ];

  // Active icon index in dockIcons:
  // dockIndex 0 -> index 1 (Dashboard)
  // dockIndex 1 -> index 2 (Habits)
  // dockIndex 2 -> index 3 (Study)
  const activeIconIndex = 1 + currentDockIndex;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.canvasSoft,
        fontFamily: theme.fontFamily,
        overflow: "hidden",
      }}
    >
      {/* Top Scene Caption */}
      <Caption text="Web and Android." duration={SCENE_7_DURATION} />

      {/* ============================================================ */}
      {/* Phone Frame (Center-Left) */}
      {/* ============================================================ */}
      <PhoneFrame
        width={440}
        height={830}
        top={180}
        left={500}
        style={{
          transform: `translate(-50%, ${phoneTranslateY}px)`,
          opacity: phoneOpacity,
          boxShadow: "0 28px 60px rgba(0, 0, 0, 0.28), 0 4px 12px rgba(0, 0, 0, 0.12)",
        }}
        screenStyle={{
          backgroundColor: "#f6f5f4",
        }}
      >
        {/* Paged Content Container: 3 screens sliding horizontally */}
        <div
          style={{
            display: "flex",
            width: phoneScreenWidth * 3,
            height: "100%",
            transform: `translateX(${pageTranslateX}px)`,
          }}
        >
          {/* ======================================================== */}
          {/* PAGE 1: MOBILE DASHBOARD */}
          {/* ======================================================== */}
          <div
            style={{
              width: phoneScreenWidth,
              height: "100%",
              padding: "12px 14px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              overflow: "hidden",
            }}
          >
            {/* Deep Indigo Hero Header */}
            <div
              style={{
                backgroundColor: "#213183",
                borderRadius: 16,
                padding: "16px 14px",
                color: "#ffffff",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                boxShadow: "0 4px 14px rgba(33, 49, 131, 0.25)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "1px",
                    color: "rgba(255, 255, 255, 0.75)",
                    textTransform: "uppercase",
                  }}
                >
                  LIFEOS EXECUTIVE HUB
                </span>
                <span
                  style={{
                    fontSize: 11,
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    padding: "2px 8px",
                    borderRadius: theme.radii.full,
                  }}
                >
                  Nov 15 (46d)
                </span>
              </div>

              <div>
                <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.3px" }}>
                  Good morning, Aarav
                </div>
                <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.8)", marginTop: 2 }}>
                  3 priorities queued for today
                </div>
              </div>

              {/* Quick Action Capsules */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                {["+ Note", "+ Habit", "+ Goal"].map((pill) => (
                  <div
                    key={pill}
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.16)",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      borderRadius: theme.radii.full,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {pill}
                  </div>
                ))}
                <div
                  style={{
                    background: "linear-gradient(135deg, #0080ff 0%, #00d2ff 100%)",
                    borderRadius: theme.radii.full,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Sparkles size={11} strokeWidth={2.4} />
                  <span>AI Copilot</span>
                </div>
              </div>
            </div>

            {/* Daily Brief Priorities Banner */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 14,
                border: `1px solid ${theme.colors.hairline}`,
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: theme.colors.inkSecondary,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                Top Priorities
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      backgroundColor: "#0075de",
                      color: "#ffffff",
                      fontSize: 10,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    1
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: theme.colors.ink }}>
                    Master Raft Leader Election
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      backgroundColor: "#0075de",
                      color: "#ffffff",
                      fontSize: 10,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    2
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: theme.colors.ink }}>
                    Clear 18 Due Flashcards
                  </span>
                </div>
              </div>
            </div>

            {/* 2-Column Quick Metric Cards */}
            <div style={{ display: "flex", gap: 10 }}>
              <div
                style={{
                  flex: 1,
                  backgroundColor: "#ffffff",
                  borderRadius: 14,
                  border: `1px solid ${theme.colors.hairline}`,
                  padding: "12px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#dd5b00" }}>
                  <Flame size={16} strokeWidth={2.4} />
                  <span style={{ fontSize: 11, fontWeight: 700 }}>STREAK</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: theme.colors.ink }}>
                  21 Days
                </div>
                <span style={{ fontSize: 11, color: theme.colors.inkMuted }}>Flashcards active</span>
              </div>

              <div
                style={{
                  flex: 1,
                  backgroundColor: "#ffffff",
                  borderRadius: 14,
                  border: `1px solid ${theme.colors.hairline}`,
                  padding: "12px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#1aae39" }}>
                  <Wallet size={16} strokeWidth={2.4} />
                  <span style={{ fontSize: 11, fontWeight: 700 }}>BUDGET</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: theme.colors.ink }}>
                  Rs 8,450
                </div>
                <span style={{ fontSize: 11, color: theme.colors.inkMuted }}>of Rs 12,000</span>
              </div>
            </div>

            {/* Next Schedule Event */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 14,
                border: `1px solid ${theme.colors.hairline}`,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: "rgba(0, 117, 222, 0.12)",
                    color: "#0075de",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Clock size={16} strokeWidth={2.4} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.colors.ink }}>
                    Distributed Systems
                  </div>
                  <div style={{ fontSize: 11, color: theme.colors.inkMuted }}>
                    09:00 AM • Lecture Hall 302
                  </div>
                </div>
              </div>
              <ChevronRight size={16} color={theme.colors.inkMuted} />
            </div>
          </div>

          {/* ======================================================== */}
          {/* PAGE 2: HABITS & ROUTINES */}
          {/* ======================================================== */}
          <div
            style={{
              width: phoneScreenWidth,
              height: "100%",
              padding: "12px 14px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              overflow: "hidden",
            }}
          >
            {/* Habits Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.colors.ink }}>
                  Habits &amp; Routines
                </div>
                <div style={{ fontSize: 12, color: theme.colors.inkSecondary }}>
                  Daily consistency tracking
                </div>
              </div>
              <div
                style={{
                  backgroundColor: "#dd5b00",
                  color: "#ffffff",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: theme.radii.full,
                }}
              >
                + New Habit
              </div>
            </div>

            {/* Featured Habit Card: Flashcards */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                border: `1px solid ${theme.colors.hairline}`,
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: theme.colors.ink }}>
                    Review Due Flashcards
                  </div>
                  <div style={{ fontSize: 11, color: theme.colors.inkSecondary }}>
                    Daily &bull; 95% completion rate
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: "rgba(221, 91, 0, 0.12)",
                    borderRadius: theme.radii.full,
                    padding: "4px 10px",
                    color: "#dd5b00",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <Flame size={14} strokeWidth={2.4} />
                  <span>21d streak</span>
                </div>
              </div>

              {/* Trailing 7 Days */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                {["M", "T", "W", "T", "F", "S", "Today"].map((d, idx) => (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 10, color: theme.colors.inkMuted }}>{d}</span>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        backgroundColor: "#1aae39",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Check size={14} strokeWidth={3} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Habit Card 2: LeetCode */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 14,
                border: `1px solid ${theme.colors.hairline}`,
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.colors.ink }}>
                  Solve 2 LeetCode Problems
                </div>
                <div style={{ fontSize: 11, color: theme.colors.inkSecondary }}>
                  Completed today &bull; 14-day streak
                </div>
              </div>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: "#1aae39",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Check size={16} strokeWidth={3} />
              </div>
            </div>

            {/* Habit Card 3: Deep Work */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 14,
                border: `1px solid ${theme.colors.hairline}`,
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.colors.ink }}>
                  Deep Work Study (2 Hours)
                </div>
                <div style={{ fontSize: 11, color: theme.colors.inkSecondary }}>
                  Completed today &bull; 8-day streak
                </div>
              </div>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: "#1aae39",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Check size={16} strokeWidth={3} />
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* PAGE 3: STUDY PLANNER */}
          {/* ======================================================== */}
          <div
            style={{
              width: phoneScreenWidth,
              height: "100%",
              padding: "12px 14px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              overflow: "hidden",
            }}
          >
            {/* Study Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.colors.ink }}>
                  Study Planner
                </div>
                <div style={{ fontSize: 12, color: theme.colors.inkSecondary }}>
                  GATE CS &bull; 46 days left
                </div>
              </div>
              <div
                style={{
                  backgroundColor: "#0075de",
                  color: "#ffffff",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: theme.radii.full,
                }}
              >
                + New Subject
              </div>
            </div>

            {/* Spaced Repetition Queue Banner */}
            <div
              style={{
                backgroundColor: "#0075de",
                borderRadius: 16,
                padding: "14px 16px",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 4px 14px rgba(0, 117, 222, 0.3)",
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  Review Queue
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
                  18 flashcards due now
                </div>
              </div>
              <div
                style={{
                  backgroundColor: "#ffffff",
                  color: "#0075de",
                  borderRadius: theme.radii.full,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Start (18)
              </div>
            </div>

            {/* Subject 1: Distributed Systems */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 14,
                border: `1px solid ${theme.colors.hairline}`,
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: theme.colors.ink }}>
                  Distributed Systems
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#0075de",
                    backgroundColor: "rgba(0,117,222,0.1)",
                    padding: "2px 8px",
                    borderRadius: theme.radii.full,
                  }}
                >
                  33% Done
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  backgroundColor: "#f0eeeb",
                  borderRadius: 99,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: "33%",
                    backgroundColor: "#0075de",
                    borderRadius: 99,
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: theme.colors.inkMuted }}>
                Next: Raft &amp; Paxos Consensus &bull; Due in 3d
              </div>
            </div>

            {/* Subject 2: Database Management */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 14,
                border: `1px solid ${theme.colors.hairline}`,
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: theme.colors.ink }}>
                  Database Management
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#7c3aed",
                    backgroundColor: "rgba(124,58,237,0.1)",
                    padding: "2px 8px",
                    borderRadius: theme.radii.full,
                  }}
                >
                  0% Done
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  backgroundColor: "#f0eeeb",
                  borderRadius: 99,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: "0%",
                    backgroundColor: "#7c3aed",
                    borderRadius: 99,
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: theme.colors.inkMuted }}>
                Next: B+ Tree Indexing &bull; 75 min
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* Floating Ephemeral Label Pill (Above Dock) */}
        {/* ======================================================== */}
        <div
          style={{
            position: "absolute",
            bottom: 84,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(17, 24, 39, 0.85)",
            color: "#ffffff",
            padding: "5px 14px",
            borderRadius: theme.radii.full,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.4px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            opacity: activeLabelOpacity,
            pointerEvents: "none",
            zIndex: 45,
          }}
        >
          {activeLabelText}
        </div>

        {/* ======================================================== */}
        {/* Frosted Glass Floating Dock (Pill, 16px above bottom) */}
        {/* ======================================================== */}
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 18,
            right: 18,
            height: 58,
            borderRadius: theme.radii.full,
            backgroundColor: "rgba(255, 255, 255, 0.82)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.65)",
            boxShadow: "0 10px 28px rgba(0, 0, 0, 0.14), 0 1px 3px rgba(0, 0, 0, 0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            zIndex: 40,
          }}
        >
          {/* Fixed Center Circular Blue Indicator */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 44,
              height: 44,
              borderRadius: "50%",
              backgroundColor: "#0075de",
              boxShadow: "0 4px 14px rgba(0, 117, 222, 0.4)",
              zIndex: 1,
            }}
          />

          {/* Track of Dock Icons centered on activeIconIndex */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              zIndex: 2,
            }}
          >
            {dockIcons.map((item, idx) => {
              const IconComp = item.icon;
              const distFromCenter = Math.abs(activeIconIndex - idx);
              const itemScale = interpolate(
                distFromCenter,
                [0, 1],
                [1.28, 1.0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );
              const isCentered = distFromCenter < 0.45;
              const iconColor = isCentered ? "#ffffff" : "#64748b";
              const xPos = (idx - activeIconIndex) * dockItemSpacing;

              return (
                <div
                  key={item.id}
                  style={{
                    position: "absolute",
                    left: xPos,
                    top: 0,
                    transform: `translate(-50%, -50%) scale(${itemScale})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 44,
                    height: 44,
                  }}
                >
                  <IconComp size={22} color={iconColor} strokeWidth={2.4} />
                </div>
              );
            })}
          </div>
        </div>
      </PhoneFrame>

      {/* ============================================================ */}
      {/* Right Side: Stacked Large Platform Labels (Web & Android) */}
      {/* ============================================================ */}
      <div
        style={{
          position: "absolute",
          left: 860,
          top: 270,
          width: 860,
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {/* Label 1: Web (fades in at f30) */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 24,
            border: `1px solid ${theme.colors.hairline}`,
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.06)",
            padding: "28px 36px",
            display: "flex",
            alignItems: "center",
            gap: 28,
            opacity: webOpacity,
            transform: `translateY(${webTranslateY}px)`,
          }}
        >
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 20,
              backgroundColor: "rgba(0, 117, 222, 0.12)",
              color: "#0075de",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Globe size={42} strokeWidth={2.2} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span
                style={{
                  fontSize: 38,
                  fontWeight: 700,
                  color: theme.colors.ink,
                  letterSpacing: "-0.8px",
                }}
              >
                Web
              </span>
              <span
                style={{
                  backgroundColor: "rgba(0, 117, 222, 0.12)",
                  color: "#0075de",
                  borderRadius: theme.radii.full,
                  padding: "4px 14px",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Live in Browser
              </span>
            </div>
            <span
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: theme.colors.inkSecondary,
                lineHeight: 1.4,
              }}
            >
              Full-bleed desktop command center for deep study and lecture time-blocking.
            </span>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              {["Full-Bleed Layouts", "Split-View Editor", "Instant Sync"].map((tag) => (
                <span
                  key={tag}
                  style={{
                    backgroundColor: "#f6f5f4",
                    borderRadius: theme.radii.full,
                    border: `1px solid ${theme.colors.hairline}`,
                    padding: "3px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: theme.colors.inkSecondary,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Label 2: Android (fades in at f45) */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 24,
            border: `1px solid ${theme.colors.hairline}`,
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.06)",
            padding: "28px 36px",
            display: "flex",
            alignItems: "center",
            gap: 28,
            opacity: androidOpacity,
            transform: `translateY(${androidTranslateY}px)`,
          }}
        >
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 20,
              backgroundColor: "rgba(26, 174, 57, 0.12)",
              color: "#1aae39",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Smartphone size={42} strokeWidth={2.2} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span
                style={{
                  fontSize: 38,
                  fontWeight: 700,
                  color: theme.colors.ink,
                  letterSpacing: "-0.8px",
                }}
              >
                Android
              </span>
              <span
                style={{
                  backgroundColor: "rgba(26, 174, 57, 0.12)",
                  color: "#1aae39",
                  borderRadius: theme.radii.full,
                  padding: "4px 14px",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Native Companion
              </span>
            </div>
            <span
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: theme.colors.inkSecondary,
                lineHeight: 1.4,
              }}
            >
              Offline-ready SQLite sync with tactile floating dock in your pocket.
            </span>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              {["SQLite Local Sync", "Edge-to-Edge UI", "Push Notifications"].map((tag) => (
                <span
                  key={tag}
                  style={{
                    backgroundColor: "#f6f5f4",
                    borderRadius: theme.radii.full,
                    border: `1px solid ${theme.colors.hairline}`,
                    padding: "3px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: theme.colors.inkSecondary,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
