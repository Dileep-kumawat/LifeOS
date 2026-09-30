import React from "react";
import {
  AbsoluteFill,
  interpolate,
  staticFile,
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
} from "lucide-react";
import { easings } from "../motion";
import { theme } from "../theme";

export const SCENE_2_DURATION = 90;

interface AppTileConfig {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  iconColor: string;
  iconBg: string;
  snippetTitle: string;
  snippetDetail?: string;
  baseX: number;
  baseY: number;
  baseRot: number;
}

// Same 10 generic app tiles from Scene 1
const COLLAPSING_TILES: AppTileConfig[] = [
  {
    id: "calendar",
    name: "Calendar",
    icon: Calendar,
    iconColor: "#0075de",
    iconBg: "rgba(0, 117, 222, 0.12)",
    snippetTitle: "09:00 AM • Lecture Hall 302",
    snippetDetail: "Distributed Systems",
    baseX: 240,
    baseY: 220,
    baseRot: -4.5,
  },
  {
    id: "notes",
    name: "Notes",
    icon: FileText,
    iconColor: "#523410",
    iconBg: "rgba(82, 52, 16, 0.10)",
    snippetTitle: "Raft Consensus Protocols",
    snippetDetail: "12 unfiled pages",
    baseX: 580,
    baseY: 205,
    baseRot: 3.2,
  },
  {
    id: "flashcards",
    name: "Flashcards",
    icon: Layers,
    iconColor: "#62aef0",
    iconBg: "rgba(98, 174, 240, 0.15)",
    snippetTitle: "18 SM-2 reviews pending",
    snippetDetail: "Optimal recall threshold",
    baseX: 950,
    baseY: 215,
    baseRot: -3.0,
  },
  {
    id: "tasks",
    name: "Tasks",
    icon: CheckSquare,
    iconColor: "#b8127f",
    iconBg: "rgba(255, 100, 200, 0.14)",
    snippetTitle: "14 uncompleted tasks",
    snippetDetail: "3 high-priority overdue",
    baseX: 1330,
    baseY: 235,
    baseRot: 4.5,
  },
  {
    id: "habits",
    name: "Habits",
    icon: Flame,
    iconColor: "#dd5b00",
    iconBg: "rgba(221, 91, 0, 0.12)",
    snippetTitle: "14d streak at risk",
    snippetDetail: "4 checks remaining today",
    baseX: 190,
    baseY: 425,
    baseRot: 5.2,
  },
  {
    id: "budget",
    name: "Budget",
    icon: Wallet,
    iconColor: "#1aae39",
    iconBg: "rgba(26, 174, 57, 0.12)",
    snippetTitle: "₹8,450 spent of ₹12,000",
    snippetDetail: "₹3,550 left this month",
    baseX: 540,
    baseY: 415,
    baseRot: -4.0,
  },
  {
    id: "timer",
    name: "Timer",
    icon: Clock,
    iconColor: "#0075de",
    iconBg: "rgba(0, 117, 222, 0.12)",
    snippetTitle: "25:00 Pomodoro paused",
    snippetDetail: "Cycle 1 of 4 interrupted",
    baseX: 910,
    baseY: 405,
    baseRot: 3.8,
  },
  {
    id: "docs",
    name: "Docs",
    icon: Folder,
    iconColor: "#2a9d99",
    iconBg: "rgba(42, 157, 153, 0.12)",
    snippetTitle: "Syllabus_2026.pdf",
    snippetDetail: "4.2 MB • Updated yesterday",
    baseX: 310,
    baseY: 635,
    baseRot: -3.5,
  },
  {
    id: "reminders",
    name: "Reminders",
    icon: Bell,
    iconColor: "#dd5b00",
    iconBg: "rgba(221, 91, 0, 0.12)",
    snippetTitle: "GATE Exam Registration",
    snippetDetail: "Deadline in 48 hours",
    baseX: 720,
    baseY: 630,
    baseRot: 4.2,
  },
  {
    id: "chatbot",
    name: "Chatbot",
    icon: MessageSquare,
    iconColor: "#213183",
    iconBg: "rgba(33, 49, 131, 0.12)",
    snippetTitle: "Schedule focus block?",
    snippetDetail: "Unanswered suggestion",
    baseX: 1160,
    baseY: 570,
    baseRot: -4.5,
  },
];

export const Scene2Logo: React.FC = () => {
  const frame = useCurrentFrame();

  // Background cross-fades from canvasSoft (#f6f5f4) to pure white (#ffffff) over f0-20
  const bgProg = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });

  // f15-55: Ribbon mark reveal sweep
  const ribbonProg = interpolate(frame, [15, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });

  // Ribbon scale and calm entry
  const ribbonScale = interpolate(ribbonProg, [0, 1], [0.88, 1], {
    easing: easings.decel,
  });
  const ribbonOpacity = interpolate(ribbonProg, [0, 0.15, 1], [0, 1, 1]);

  // Mask path stroke length ~1700px tracing the ribbon path
  const maskPathLength = 1700;
  const maskDashoffset = (1 - ribbonProg) * maskPathLength;

  // f45-75: Wordmark "LifeOS" slides down from behind the ribbon
  const wordmarkProg = interpolate(frame, [45, 75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });
  const wordmarkTranslateY = interpolate(wordmarkProg, [0, 1], [-50, 0]);
  const wordmarkOpacity = interpolate(wordmarkProg, [0, 0.35, 1], [0, 0.75, 1]);

  // f60-90: Caption "One workspace. One AI." enters and holds until end of scene
  const captionProg = interpolate(frame, [60, 74], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });
  const captionTranslateY = interpolate(captionProg, [0, 1], [22, 0]);
  const captionOpacity = captionProg;

  // Convergence point for the 10 collapsing tiles (center of ribbon mark)
  const targetX = 960;
  const targetY = 440;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: `rgba(255, 255, 255, ${bgProg})`,
        overflow: "hidden",
        fontFamily: theme.fontFamily,
      }}
    >
      {/* Background underlay for smooth crossfade from #f6f5f4 */}
      {bgProg < 1 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: theme.colors.canvasSoft,
            opacity: 1 - bgProg,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Top Caption: "One workspace. One AI." (f60-90, holds until scene end) */}
      {frame >= 60 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 180,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 50,
          }}
        >
          <div
            style={{
              fontFamily: theme.fontFamily,
              fontSize: 64,
              lineHeight: "64px",
              fontWeight: 700,
              letterSpacing: "-2.125px",
              color: theme.colors.ink,
              textAlign: "center",
              opacity: captionOpacity,
              transform: `translateY(${captionTranslateY}px)`,
            }}
          >
            One workspace. One AI.
          </div>
        </div>
      )}

      {/* f0-20: 10 Tiles converging to the center and shrinking to a point */}
      {frame <= 25 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: "scale(1.04)",
            transformOrigin: "center center",
            pointerEvents: "none",
            zIndex: 20,
          }}
        >
          {COLLAPSING_TILES.map((tile, i) => {
            // Staggered 1 frame apart, pull duration 16 frames so tiles are fully visible converging
            const startF = i * 1.2;
            const endF = startF + 16;
            const pullProg = interpolate(frame, [startF, endF], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: easings.decel,
            });

            const currentX = interpolate(pullProg, [0, 1], [tile.baseX, targetX - 137]);
            const currentY = interpolate(pullProg, [0, 1], [tile.baseY, targetY - 60]);
            const currentScale = interpolate(pullProg, [0, 0.7, 1], [1, 0.6, 0]);
            const currentOpacity = interpolate(pullProg, [0, 0.85, 1], [1, 0.7, 0]);
            const currentRot = interpolate(pullProg, [0, 1], [tile.baseRot, 0]);

            if (currentOpacity <= 0) return null;

            const IconComp = tile.icon;

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
                  boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
                  padding: "13px 15px",
                  transform: `scale(${currentScale}) rotate(${currentRot}deg)`,
                  opacity: currentOpacity,
                  transformOrigin: "center center",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {/* 99+ Badge */}
                <div
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    backgroundColor: theme.colors.warning,
                    color: "#ffffff",
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: "14px",
                    borderRadius: theme.radii.full,
                    padding: "2px 7px",
                    border: "2px solid #ffffff",
                    boxShadow: "0 2px 7px rgba(221, 91, 0, 0.45)",
                  }}
                >
                  99+
                </div>

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
                    }}
                  >
                    <IconComp size={17} strokeWidth={2.2} />
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: theme.colors.ink,
                      letterSpacing: "-0.2px",
                    }}
                  >
                    {tile.name}
                  </span>
                </div>

                <div
                  style={{
                    backgroundColor: theme.colors.canvasSoft,
                    borderRadius: theme.radii.sm,
                    padding: "7px 9px",
                    border: `1px solid ${theme.colors.hairline}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: theme.colors.inkSecondary,
                    }}
                  >
                    {tile.snippetTitle}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Center Brand Hero: LifeOS Ribbon Mark + Wordmark */}
      <div
        style={{
          position: "absolute",
          top: "52%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 30,
        }}
      >
        {/* Ribbon Mark Container with Animated Mask Sweep */}
        {ribbonOpacity > 0 && (
          <div
            style={{
              position: "relative",
              width: 440,
              height: 310,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${ribbonScale})`,
              opacity: ribbonOpacity,
              transformOrigin: "center center",
              zIndex: 10,
            }}
          >
            <svg
              width="440"
              height="310"
              viewBox="0 0 620 436"
              style={{ overflow: "visible" }}
            >
              <defs>
                {/* 
                  Smooth sweep mask following the exact ribbon flow:
                  Top-left stem (60, 25) down to bottom curve,
                  crossing through center and looping through the right circular 'O'
                */}
                <mask id="ribbonSweepMask">
                  {frame >= 55 ? (
                    // When reveal finishes, show 100% of the authentic logo with zero clipping
                    <rect x="-50" y="-50" width="720" height="536" fill="#ffffff" />
                  ) : (
                    <path
                      d="M 60 25 L 60 300 C 60 380 110 395 160 370 L 250 280 C 310 200 370 95 470 95 C 570 95 600 170 580 270 C 560 370 480 415 420 405 C 330 390 290 280 325 200"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="150"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="1700"
                      strokeDashoffset={maskDashoffset}
                    />
                  )}
                </mask>
              </defs>

              <image
                href={staticFile("video-assets/logo-ribbon-transparent.png")}
                x="0"
                y="0"
                width="620"
                height="436"
                mask="url(#ribbonSweepMask)"
                preserveAspectRatio="xMidYMid meet"
              />
            </svg>
          </div>
        )}

        {/* Wordmark: "LifeOS" sliding in from behind the ribbon */}
        {wordmarkOpacity > 0 && (
          <div
            style={{
              position: "relative",
              marginTop: 18,
              zIndex: 5,
              overflow: "hidden", // Clean reveal as it emerges from behind the ribbon
              paddingTop: 4,
              paddingBottom: 4,
              paddingLeft: 12,
              paddingRight: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "center",
                transform: `translateY(${wordmarkTranslateY}px)`,
                opacity: wordmarkOpacity,
                userSelect: "none",
              }}
            >
              <span
                style={{
                  fontFamily: theme.fontFamily,
                  fontSize: 92,
                  fontWeight: 700,
                  color: "#111827",
                  letterSpacing: "-3.5px",
                  lineHeight: 1,
                }}
              >
                Life
              </span>
              <span
                style={{
                  fontFamily: theme.fontFamily,
                  fontSize: 92,
                  fontWeight: 700,
                  letterSpacing: "-3.5px",
                  lineHeight: 1,
                  background: "linear-gradient(135deg, #0080ff 0%, #00d2ff 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  display: "inline-block",
                }}
              >
                OS
              </span>
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// Default export alias for seamless composition references
export const Scene2Problem = Scene2Logo;
