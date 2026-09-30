import React from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  useCurrentFrame,
} from "remotion";
import {
  Calendar,
  FileText,
  Layers,
  Flame,
  Wallet,
  Clock,
  CheckSquare,
  MessageSquare,
  Folder,
  Bell,
  GraduationCap,
  LayoutGrid,
} from "lucide-react";
import { Caption } from "../components/Caption";
import { easings, popIn } from "../motion";
import { theme } from "../theme";

export const SCENE_1_DURATION = 150;

interface AppTileConfig {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  iconColor: string;
  iconBg: string;
  snippetTitle: string;
  snippetDetail?: string;
  popFrame: number;
  baseX: number;
  baseY: number;
  baseRot: number;
  initialBadge: number;
  maxBadge: number;
}

// 10 Generic App Tiles organically staggered and overlapping across the canvas
const APP_TILES: AppTileConfig[] = [
  {
    id: "calendar",
    name: "Calendar",
    icon: Calendar,
    iconColor: "#0075de",
    iconBg: "rgba(0, 117, 222, 0.12)",
    snippetTitle: "09:00 AM • Lecture Hall 302",
    snippetDetail: "Distributed Systems",
    popFrame: 30,
    baseX: 240,
    baseY: 220,
    baseRot: -4.5,
    initialBadge: 3,
    maxBadge: 16,
  },
  {
    id: "notes",
    name: "Notes",
    icon: FileText,
    iconColor: "#523410",
    iconBg: "rgba(82, 52, 16, 0.10)",
    snippetTitle: "Raft Consensus Protocols",
    snippetDetail: "12 unfiled pages",
    popFrame: 39,
    baseX: 580,
    baseY: 205,
    baseRot: 3.2,
    initialBadge: 7,
    maxBadge: 31,
  },
  {
    id: "flashcards",
    name: "Flashcards",
    icon: Layers,
    iconColor: "#62aef0",
    iconBg: "rgba(98, 174, 240, 0.15)",
    snippetTitle: "18 SM-2 reviews pending",
    snippetDetail: "Optimal recall threshold",
    popFrame: 48,
    baseX: 950,
    baseY: 215,
    baseRot: -3.0,
    initialBadge: 18,
    maxBadge: 45,
  },
  {
    id: "tasks",
    name: "Tasks",
    icon: CheckSquare,
    iconColor: "#b8127f",
    iconBg: "rgba(255, 100, 200, 0.14)",
    snippetTitle: "14 uncompleted tasks",
    snippetDetail: "3 high-priority overdue",
    popFrame: 57,
    baseX: 1330,
    baseY: 235,
    baseRot: 4.5,
    initialBadge: 12,
    maxBadge: 54,
  },
  {
    id: "habits",
    name: "Habits",
    icon: Flame,
    iconColor: "#dd5b00",
    iconBg: "rgba(221, 91, 0, 0.12)",
    snippetTitle: "14d streak at risk",
    snippetDetail: "4 checks remaining today",
    popFrame: 66,
    baseX: 190,
    baseY: 425,
    baseRot: 5.2,
    initialBadge: 4,
    maxBadge: 19,
  },
  {
    id: "budget",
    name: "Budget",
    icon: Wallet,
    iconColor: "#1aae39",
    iconBg: "rgba(26, 174, 57, 0.12)",
    snippetTitle: "₹8,450 spent of ₹12,000",
    snippetDetail: "₹3,550 left this month",
    popFrame: 75,
    baseX: 540,
    baseY: 415,
    baseRot: -4.0,
    initialBadge: 5,
    maxBadge: 24,
  },
  {
    id: "timer",
    name: "Timer",
    icon: Clock,
    iconColor: "#0075de",
    iconBg: "rgba(0, 117, 222, 0.12)",
    snippetTitle: "25:00 Pomodoro paused",
    snippetDetail: "Cycle 1 of 4 interrupted",
    popFrame: 84,
    baseX: 910,
    baseY: 405,
    baseRot: 3.8,
    initialBadge: 2,
    maxBadge: 11,
  },
  {
    id: "docs",
    name: "Docs",
    icon: Folder,
    iconColor: "#2a9d99",
    iconBg: "rgba(42, 157, 153, 0.12)",
    snippetTitle: "Syllabus_2026.pdf",
    snippetDetail: "4.2 MB • Updated yesterday",
    popFrame: 93,
    baseX: 310,
    baseY: 635,
    baseRot: -3.5,
    initialBadge: 9,
    maxBadge: 68,
  },
  {
    id: "reminders",
    name: "Reminders",
    icon: Bell,
    iconColor: "#dd5b00",
    iconBg: "rgba(221, 91, 0, 0.12)",
    snippetTitle: "GATE Exam Registration",
    snippetDetail: "Deadline in 48 hours",
    popFrame: 102,
    baseX: 720,
    baseY: 630,
    baseRot: 4.2,
    initialBadge: 8,
    maxBadge: 86,
  },
  {
    id: "chatbot",
    name: "Chatbot",
    icon: MessageSquare,
    iconColor: "#213183",
    iconBg: "rgba(33, 49, 131, 0.12)",
    snippetTitle: "Schedule focus block?",
    snippetDetail: "Unanswered suggestion",
    popFrame: 111,
    baseX: 1160,
    baseY: 570,
    baseRot: -4.5,
    initialBadge: 6,
    maxBadge: 42,
  },
];

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();

  // Clamp animations at frame 147 for a razor-clean hard cut transition at 150
  const activeFrame = Math.min(frame, 147);

  // --- f0-60: Giant "46" Animation ---
  // Pop in centered between f0 and f16 with spring curve
  const giantPop = popIn(activeFrame, 0, 16);

  // At f45-58: giant 46 scales down, moves towards top-left, and fades
  const glideProgress = interpolate(activeFrame, [45, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });

  const giantScale = interpolate(
    glideProgress,
    [0, 1],
    [giantPop.scale, 0.14]
  );
  const giantX = interpolate(glideProgress, [0, 1], [960, 200]);
  const giantY = interpolate(glideProgress, [0, 1], [540, 75]);
  const giantOpacity =
    glideProgress >= 1
      ? 0
      : giantPop.opacity * interpolate(glideProgress, [0, 0.85, 1], [1, 0.5, 0]);

  // Top-left chip "Exam in 46 days (Nov 15)" emerges at f48
  const chipPop = popIn(activeFrame, 48, 10);

  // --- f120-150: Tension Builds ---
  // Jitter speeds up, badges surge to 99+, overall layout scales up ~4%
  const tensionProgress = interpolate(activeFrame, [120, 146], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.standard,
  });

  const tensionScale = 1 + tensionProgress * 0.04;
  const jitterIntensity = 2.2 + tensionProgress * 5.2; // Restrained Swiss chaos: 2.2px up to 7.4px

  // Top-right counter: ticks 1 -> 10 as tiles pop in
  let openAppsCount = 0;
  for (const tile of APP_TILES) {
    if (activeFrame >= tile.popFrame) {
      openAppsCount += 1;
    }
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.canvasSoft,
        overflow: "hidden",
        fontFamily: theme.fontFamily,
      }}
    >
      {/* Captions: Top-center within top 180px */}
      {frame < 60 && (
        <Caption
          text="46 days to your exam."
          startFrame={0}
          duration={60}
        />
      )}
      {frame >= 60 && (
        <Caption
          text="10 apps to manage it."
          startFrame={60}
          duration={90}
        />
      )}

      {/* Top-Left Chip: "Exam in 46 days • Nov 15" */}
      {chipPop.opacity > 0 && (
        <div
          style={{
            position: "absolute",
            top: 56,
            left: 70,
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.full,
            border: `1px solid ${theme.colors.hairline}`,
            padding: "8px 18px",
            boxShadow: theme.shadows.level1,
            opacity: chipPop.opacity,
            transform: `scale(${chipPop.scale})`,
            zIndex: 40,
            userSelect: "none",
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              backgroundColor: "rgba(0, 117, 222, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: theme.colors.primary,
            }}
          >
            <GraduationCap size={15} strokeWidth={2.2} />
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: theme.colors.ink,
              letterSpacing: "-0.1px",
            }}
          >
            Exam in 46 days
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: theme.colors.inkMuted,
            }}
          >
            • Nov 15
          </span>
        </div>
      )}

      {/* Top-Right Counter Chip: "Apps open" ticking 1 -> 10 */}
      {openAppsCount > 0 && (
        <div
          style={{
            position: "absolute",
            top: 56,
            right: 70,
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.full,
            border: `1px solid ${
              openAppsCount === 10 ? "rgba(221, 91, 0, 0.35)" : theme.colors.hairline
            }`,
            padding: "8px 18px",
            boxShadow:
              openAppsCount === 10
                ? "0 4px 14px rgba(221, 91, 0, 0.15)"
                : theme.shadows.level1,
            zIndex: 40,
            userSelect: "none",
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              backgroundColor:
                openAppsCount === 10
                  ? "rgba(221, 91, 0, 0.12)"
                  : "rgba(0, 0, 0, 0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color:
                openAppsCount === 10 ? theme.colors.warning : theme.colors.inkSecondary,
            }}
          >
            <LayoutGrid size={14} strokeWidth={2.2} />
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: theme.colors.inkSecondary,
            }}
          >
            Apps open:
          </span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color:
                openAppsCount === 10 ? theme.colors.warning : theme.colors.ink,
              minWidth: 20,
              textAlign: "center",
            }}
          >
            {openAppsCount}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: theme.colors.inkFaint,
            }}
          >
            / 10
          </span>
        </div>
      )}

      {/* Giant "46" (Centered f0-45, glides f45-58) */}
      {giantOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            left: giantX,
            top: giantY,
            transform: `translate(-50%, -50%) scale(${giantScale})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 35,
            opacity: giantOpacity,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <div
            style={{
              fontFamily: theme.fontFamily,
              fontSize: 320,
              lineHeight: 0.88,
              fontWeight: 700,
              letterSpacing: "-14px",
              color: theme.colors.ink,
              textAlign: "center",
            }}
          >
            46
          </div>
          {glideProgress < 0.25 && (
            <div
              style={{
                fontFamily: theme.fontFamily,
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: "0.2px",
                color: theme.colors.inkMuted,
                marginTop: 12,
                textTransform: "uppercase",
              }}
            >
              Days Remaining
            </div>
          )}
        </div>
      )}

      {/* 10 Generic App Tiles with Overlaps and Restrained Chaos */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${tensionScale})`,
          transformOrigin: "center center",
          pointerEvents: "none",
        }}
      >
        {APP_TILES.map((tile, i) => {
          if (activeFrame < tile.popFrame) return null;

          const pop = popIn(activeFrame, tile.popFrame, 12);
          const IconComp = tile.icon;

          // Seeded subtle drift and jitter
          const age = activeFrame - tile.popFrame;
          const driftX = Math.sin((age + i * 23) * 0.04) * 4;
          const driftY = Math.cos((age + i * 19) * 0.035) * 4;

          // Jitter updates every 3 frames for crisp digital tension
          const jitterStep = Math.floor(activeFrame / 3);
          const seedX = `jitter-x-${tile.id}-${jitterStep}`;
          const seedY = `jitter-y-${tile.id}-${jitterStep}`;
          const seedRot = `jitter-rot-${tile.id}-${jitterStep}`;

          const jitterX = (random(seedX) - 0.5) * jitterIntensity;
          const jitterY = (random(seedY) - 0.5) * jitterIntensity;
          const jitterRot = (random(seedRot) - 0.5) * (jitterIntensity * 0.35);

          // Notification badge count calculation:
          // Normal count up from popFrame to 120, then escalates to "99+"
          let badgeText: string;
          if (activeFrame < 120) {
            const badgeProg = interpolate(
              activeFrame,
              [tile.popFrame, 120],
              [tile.initialBadge, tile.maxBadge],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: easings.standard,
              }
            );
            badgeText = String(Math.floor(badgeProg));
          } else {
            const surgeProg = interpolate(
              activeFrame,
              [120, 142],
              [tile.maxBadge, 100],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: easings.pop,
              }
            );
            badgeText = surgeProg >= 99 ? "99+" : String(Math.floor(surgeProg));
          }

          const currentX = tile.baseX + driftX + jitterX;
          const currentY = tile.baseY + driftY + jitterY;
          const currentRot = tile.baseRot + jitterRot;

          return (
            <div
              key={tile.id}
              style={{
                position: "absolute",
                left: currentX,
                top: currentY,
                width: 275,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radii.xl,
                border: `1px solid ${theme.colors.hairline}`,
                boxShadow:
                  activeFrame >= 120
                    ? "0 16px 36px rgba(0, 0, 0, 0.18), 0 3px 8px rgba(0,0,0,0.06)"
                    : "0 6px 18px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0,0,0,0.04)",
                padding: "13px 15px",
                transform: `scale(${pop.scale}) rotate(${currentRot}deg)`,
                opacity: pop.opacity,
                transformOrigin: "center center",
                zIndex: 10 + i,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {/* Notification Badge at Top-Right */}
              <div
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  backgroundColor: theme.colors.warning, // #dd5b00
                  color: "#ffffff",
                  fontSize: 11,
                  fontWeight: 700,
                  lineHeight: "14px",
                  borderRadius: theme.radii.full,
                  padding: badgeText === "99+" ? "2px 7px" : "2px 6px",
                  boxShadow: "0 2px 7px rgba(221, 91, 0, 0.45)",
                  border: "2px solid #ffffff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 20,
                  boxSizing: "border-box",
                  transform: badgeText === "99+" ? "scale(1.08)" : "scale(1)",
                }}
              >
                {badgeText}
              </div>

              {/* App Tile Header: Icon + Name */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: tile.iconBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: tile.iconColor,
                      flexShrink: 0,
                    }}
                  >
                    <IconComp size={17} strokeWidth={2.2} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: theme.colors.ink,
                        lineHeight: "17px",
                        letterSpacing: "-0.2px",
                      }}
                    >
                      {tile.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        color: theme.colors.inkFaint,
                        lineHeight: "12px",
                      }}
                    >
                      Background App
                    </span>
                  </div>
                </div>

                {/* Subtle indicator dot */}
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    backgroundColor:
                      activeFrame >= 120
                        ? theme.colors.warning
                        : theme.colors.primary,
                  }}
                />
              </div>

              {/* App Tile Body snippet */}
              <div
                style={{
                  backgroundColor: theme.colors.canvasSoft,
                  borderRadius: theme.radii.sm,
                  padding: "7px 9px",
                  border: `1px solid ${theme.colors.hairline}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: theme.colors.inkSecondary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: "15px",
                  }}
                >
                  {tile.snippetTitle}
                </span>
                {tile.snippetDetail && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: theme.colors.inkMuted,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      lineHeight: "13px",
                    }}
                  >
                    {tile.snippetDetail}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
