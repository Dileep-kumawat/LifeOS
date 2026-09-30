import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import {
  Sparkles,
  ArrowUp,
  Mic,
  Plus,
  Clock,
  Check,
  Calendar,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { Caption } from "../components/Caption";
import { BrowserWindow } from "../components/BrowserWindow";
import { FakeCursor } from "../components/FakeCursor";
import { easings } from "../motion";
import { theme } from "../theme";
import { AI_CONVERSATION, CALENDAR_EVENTS } from "../demoData";

export const SCENE_4_DURATION = 210; // 7 seconds at 30 fps

export const Scene4AI: React.FC = () => {
  const frame = useCurrentFrame();

  // Slow camera push-in: scale 1.00 -> 1.04
  const cameraScale = interpolate(frame, [0, SCENE_4_DURATION], [1.0, 1.04], {
    extrapolateRight: "clamp",
  });

  // Typewriter for user message (2 characters per frame from f15 to ~70)
  const fullUserText = AI_CONVERSATION.userPrompt;
  const userCharCount = Math.floor(
    interpolate(frame, [15, 68], [0, fullUserText.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const typedUserText = fullUserText.slice(0, userCharCount);

  // At f75, user text becomes a right-aligned chat bubble
  const userBubbleProg = interpolate(frame, [75, 83], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });

  // f80-140: AI reply streams in, 1-2 words per 2 frames
  const fullAiText = AI_CONVERSATION.aiResponse;
  const aiWords = fullAiText.split(" ");
  const aiWordCount = Math.floor(
    interpolate(frame, [80, 138], [0, aiWords.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const streamedAiText = aiWords.slice(0, aiWordCount).join(" ");
  const isAiStreaming = frame >= 80 && frame < 140;

  // Caret blinking (every 8 frames)
  const showCaret = Math.floor(frame / 8) % 2 === 0;

  // f140: Tool confirmation card slides up
  const toolCardProg = interpolate(frame, [140, 154], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.decel,
  });
  const toolCardTranslateY = interpolate(toolCardProg, [0, 1], [35, 0]);

  // Calendar day-view strip dimming: slightly dimmed until f140
  const calendarOpacity = interpolate(frame, [138, 148], [0.45, 1.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // f165: Click on Confirm button
  const isConfirmPressed = frame >= 165 && frame < 172;
  const isBooked = frame >= 172;

  // f172-192: Blue block drops into calendar free slot
  const blockDropProg = interpolate(frame, [172, 190], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.pop,
  });
  const blockTranslateY = interpolate(blockDropProg, [0, 1], [-28, 0]);
  const blockScale = interpolate(blockDropProg, [0, 0.7, 1], [0.85, 1.04, 1.0]);

  // FakeCursor Keyframes across Scene 4
  const cursorKeyframes = [
    { frame: 0, x: 750, y: 960 },
    { frame: 12, x: 580, y: 925 },
    { frame: 15, x: 580, y: 925, click: true }, // click input at f15
    { frame: 25, x: 800, y: 940 }, // cursor rests during typing
    { frame: 140, x: 800, y: 940 },
    { frame: 160, x: 910, y: 840 }, // move to Confirm button
    { frame: 165, x: 910, y: 840, click: true }, // click Confirm button at f165
    { frame: 178, x: 1050, y: 800 }, // drifts away to right
    { frame: 215, x: 1150, y: 760 },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.canvasSoft,
        fontFamily: theme.fontFamily,
        overflow: "hidden",
      }}
    >
      {/* Captions: f0-140 "Ask in plain English." -> f140-215 "It does the rest." */}
      {frame < 140 ? (
        <Caption text="Ask in plain English." startFrame={10} duration={130} />
      ) : (
        <Caption text="It does the rest." startFrame={140} duration={75} />
      )}

      {/* Main camera push-in container */}
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transform: `scale(${cameraScale})`,
          transformOrigin: "center 540px",
        }}
      >
        {/* BrowserWindow: centered, 1680px wide (87.5% of 1920), y: 200 to 1000 */}
        <BrowserWindow
          width={1680}
          height={800}
          top={200}
          left="50%"
          title="LifeOS — AI Assistant & Daily Schedule"
          style={{
            borderRadius: 16,
            boxShadow: theme.shadows.level3,
          }}
          bodyStyle={{
            display: "flex",
            flexDirection: "row",
            backgroundColor: "#ffffff",
          }}
        >
          {/* ========================================================== */}
          {/* LEFT: LifeOS AI Chat Panel (60% width = ~1008px) */}
          {/* ========================================================== */}
          <div
            style={{
              width: "60%",
              height: "100%",
              borderRight: `1px solid ${theme.colors.hairline}`,
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#faf9f8",
              position: "relative",
            }}
          >
            {/* Chat Top Bar */}
            <div
              style={{
                height: 60,
                borderBottom: `1px solid ${theme.colors.hairline}`,
                padding: "0 28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#ffffff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, #0080ff 0%, #00d2ff 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    boxShadow: "0 2px 8px rgba(0, 128, 255, 0.3)",
                  }}
                >
                  <Sparkles size={18} strokeWidth={2.4} />
                </div>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: theme.colors.ink,
                    letterSpacing: "-0.4px",
                  }}
                >
                  LifeOS AI
                </span>
              </div>

              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0075de",
                  backgroundColor: "rgba(0, 117, 222, 0.08)",
                  padding: "4px 12px",
                  borderRadius: theme.radii.full,
                }}
              >
                RAG Context: Aarav • Syllabus & Calendar
              </div>
            </div>

            {/* Chat Body Scroll Area */}
            <div
              style={{
                flex: 1,
                padding: "24px 32px",
                display: "flex",
                flexDirection: "column",
                gap: 20,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* f0-75: Start state before user bubble exists */}
              {frame < 75 && (
                <div
                  style={{
                    position: "absolute",
                    top: "38%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 16,
                    textAlign: "center",
                    userSelect: "none",
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      backgroundColor: "#ffffff",
                      border: `1px solid ${theme.colors.hairline}`,
                      boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0075de",
                    }}
                  >
                    <Sparkles size={30} strokeWidth={2.2} />
                  </div>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 700,
                      color: theme.colors.ink,
                      letterSpacing: "-0.8px",
                    }}
                  >
                    Where should we begin?
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 500,
                      color: theme.colors.inkSecondary,
                    }}
                  >
                    Ask to schedule study sessions, generate quizzes, or log habits
                  </div>
                </div>
              )}

              {/* f75+: Right-aligned User Bubble */}
              {frame >= 75 && (
                <div
                  style={{
                    alignSelf: "flex-end",
                    maxWidth: "85%",
                    backgroundColor: "#0075de",
                    color: "#ffffff",
                    borderRadius: "18px 18px 4px 18px",
                    padding: "16px 22px",
                    boxShadow: "0 4px 14px rgba(0, 117, 222, 0.28)",
                    opacity: userBubbleProg,
                    transform: `translateY(${(1 - userBubbleProg) * 16}px)`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 500,
                      lineHeight: 1.4,
                      letterSpacing: "-0.2px",
                    }}
                  >
                    {AI_CONVERSATION.userPrompt}
                  </div>
                </div>
              )}

              {/* f80+: Left-aligned LifeOS AI Response */}
              {frame >= 80 && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    maxWidth: "92%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {/* AI Identity Row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, #0080ff 0%, #00d2ff 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                      }}
                    >
                      <Sparkles size={14} strokeWidth={2.4} />
                    </div>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: theme.colors.ink,
                      }}
                    >
                      LifeOS AI
                    </span>
                    <span style={{ fontSize: 13, color: theme.colors.inkMuted }}>
                      • Just now
                    </span>
                  </div>

                  {/* AI Streamed Text Container */}
                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "18px 18px 18px 4px",
                      padding: "18px 22px",
                      border: `1px solid ${theme.colors.hairline}`,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 500,
                        color: theme.colors.ink,
                        lineHeight: 1.45,
                        letterSpacing: "-0.2px",
                      }}
                    >
                      {streamedAiText}
                      {isAiStreaming && showCaret && (
                        <span
                          style={{
                            color: "#0075de",
                            fontWeight: 700,
                            marginLeft: 2,
                          }}
                        >
                          ▍
                        </span>
                      )}
                    </span>
                  </div>

                  {/* f140+: Tool Confirmation Card */}
                  {frame >= 140 && (
                    <div
                      style={{
                        marginTop: 4,
                        backgroundColor: "#ffffff",
                        borderRadius: 16,
                        border: `1px solid ${
                          isBooked ? "#1aae39" : theme.colors.hairline
                        }`,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                        padding: "18px 22px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        opacity: toolCardProg,
                        transform: `translateY(${toolCardTranslateY}px)`,
                      }}
                    >
                      {/* Card Header Tag */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            color: isBooked ? "#1aae39" : "#0075de",
                            fontSize: 14,
                            fontWeight: 700,
                            letterSpacing: "0.4px",
                            textTransform: "uppercase",
                          }}
                        >
                          {isBooked ? (
                            <CheckCircle2 size={16} strokeWidth={2.4} />
                          ) : (
                            <Clock size={16} strokeWidth={2.4} />
                          )}
                          <span>
                            {isBooked
                              ? "Action Completed"
                              : "Proposed Calendar Action"}
                          </span>
                        </div>

                        {isBooked && (
                          <span
                            style={{
                              backgroundColor: "rgba(26, 174, 57, 0.12)",
                              color: "#1aae39",
                              fontSize: 13,
                              fontWeight: 700,
                              padding: "2px 10px",
                              borderRadius: theme.radii.full,
                            }}
                          >
                            Synced with Google Cal
                          </span>
                        )}
                      </div>

                      {/* Main Action Title */}
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          color: theme.colors.ink,
                          letterSpacing: "-0.3px",
                        }}
                      >
                        Start Focus Session: Raft &amp; Paxos Consensus
                      </div>

                      {/* Session Metadata Chips */}
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <div
                          style={{
                            backgroundColor: "rgba(0, 117, 222, 0.08)",
                            color: "#0075de",
                            fontSize: 16,
                            fontWeight: 600,
                            padding: "6px 14px",
                            borderRadius: theme.radii.full,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Clock size={16} />
                          <span>45 min • 3:45 PM – 4:30 PM</span>
                        </div>

                        <div
                          style={{
                            backgroundColor: "#f6f5f4",
                            color: theme.colors.inkSecondary,
                            fontSize: 16,
                            fontWeight: 600,
                            padding: "6px 14px",
                            borderRadius: theme.radii.full,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Layers size={16} />
                          <span>18 Flashcards Queued</span>
                        </div>
                      </div>

                      {/* Buttons / Booked State */}
                      {!isBooked ? (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 12,
                            marginTop: 4,
                          }}
                        >
                          <div
                            style={{
                              padding: "10px 20px",
                              borderRadius: 8,
                              border: `1px solid ${theme.colors.hairline}`,
                              fontSize: 16,
                              fontWeight: 600,
                              color: theme.colors.inkSecondary,
                            }}
                          >
                            Cancel
                          </div>

                          <div
                            style={{
                              backgroundColor: "#0075de",
                              color: "#ffffff",
                              padding: "10px 24px",
                              borderRadius: 8,
                              fontSize: 16,
                              fontWeight: 700,
                              boxShadow: isConfirmPressed
                                ? "inset 0 2px 4px rgba(0,0,0,0.2)"
                                : "0 3px 10px rgba(0, 117, 222, 0.35)",
                              transform: isConfirmPressed
                                ? "scale(0.96)"
                                : "scale(1)",
                            }}
                          >
                            Confirm
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            backgroundColor: "rgba(26, 174, 57, 0.10)",
                            border: "1px solid rgba(26, 174, 57, 0.3)",
                            borderRadius: 10,
                            padding: "10px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            color: "#1aae39",
                            marginTop: 2,
                          }}
                        >
                          <Check size={20} strokeWidth={2.6} />
                          <span
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              letterSpacing: "-0.2px",
                            }}
                          >
                            Booked &amp; Added to Calendar
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Capsule Area at Bottom */}
            <div
              style={{
                height: 84,
                padding: "0 28px",
                display: "flex",
                alignItems: "center",
                backgroundColor: "#ffffff",
                borderTop: `1px solid ${theme.colors.hairline}`,
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: theme.radii.full,
                  backgroundColor: "#f6f5f4",
                  border: `1px solid ${theme.colors.hairline}`,
                  padding: "0 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                  <Plus size={20} color={theme.colors.inkMuted} />
                  <span
                    style={{
                      fontSize: 17,
                      color:
                        frame >= 15 && frame < 75
                          ? theme.colors.ink
                          : theme.colors.inkMuted,
                      fontWeight: frame >= 15 && frame < 75 ? 600 : 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {frame < 15
                      ? "Ask anything..."
                      : frame < 75
                      ? typedUserText
                      : "Ask a follow up..."}
                    {frame >= 15 && frame < 75 && showCaret && (
                      <span style={{ color: "#0075de", fontWeight: 700 }}>|</span>
                    )}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Mic size={19} color={theme.colors.inkMuted} />
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      backgroundColor:
                        frame >= 15 && frame < 75 ? "#0075de" : "#e6e6e6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                    }}
                  >
                    <ArrowUp size={18} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* RIGHT: Calendar Day-View Strip (40% width = ~672px) */}
          {/* ========================================================== */}
          <div
            style={{
              width: "40%",
              height: "100%",
              backgroundColor: "#ffffff",
              display: "flex",
              flexDirection: "column",
              opacity: calendarOpacity,
            }}
          >
            {/* Calendar Strip Header */}
            <div
              style={{
                height: 60,
                borderBottom: `1px solid ${theme.colors.hairline}`,
                padding: "0 28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#faf9f8",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Calendar size={18} color="#0075de" />
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: theme.colors.ink,
                  }}
                >
                  Today&apos;s Schedule
                </span>
              </div>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: theme.colors.inkSecondary,
                }}
              >
                Wednesday, Nov 15
              </span>
            </div>

            {/* Time Slot Flow Container */}
            <div
              style={{
                flex: 1,
                padding: "24px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Event 1: 09:00 AM - 10:30 AM */}
              <div
                style={{
                  backgroundColor: "rgba(0, 117, 222, 0.08)",
                  borderLeft: "4px solid #0075de",
                  borderRadius: "0 10px 10px 0",
                  padding: "14px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#0075de",
                    letterSpacing: "0.2px",
                  }}
                >
                  09:00 AM - 10:30 AM • LECTURE
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: theme.colors.ink,
                    lineHeight: 1.25,
                  }}
                >
                  Distributed Systems Lecture
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: theme.colors.inkSecondary,
                  }}
                >
                  Lecture Hall 302
                </div>
              </div>

              {/* Event 2: 02:00 PM - 03:30 PM */}
              <div
                style={{
                  backgroundColor: "rgba(33, 49, 131, 0.08)",
                  borderLeft: "4px solid #213183",
                  borderRadius: "0 10px 10px 0",
                  padding: "14px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#213183",
                    letterSpacing: "0.2px",
                  }}
                >
                  02:00 PM - 03:30 PM • DEEP WORK
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: theme.colors.ink,
                    lineHeight: 1.25,
                  }}
                >
                  Raft Consensus Paper Analysis
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: theme.colors.inkSecondary,
                  }}
                >
                  Linked to Raft Syllabus Topic
                </div>
              </div>

              {/* 
                THE FREE SLOT: 3:30 PM - 5:00 PM
                Before booking: shows dotted open window
                After booking (f172+): blue block drops in
              */}
              <div
                style={{
                  position: "relative",
                  minHeight: 110,
                }}
              >
                {/* Dotted Open Slot Indicator */}
                {!isBooked ? (
                  <div
                    style={{
                      height: "100%",
                      border: "2px dashed #d1d5db",
                      borderRadius: 10,
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: "#fbfbfa",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: theme.colors.inkMuted,
                        }}
                      >
                        03:30 PM - 05:00 PM (1h 30m)
                      </span>
                      <span
                        style={{
                          fontSize: 17,
                          fontWeight: 600,
                          color: theme.colors.inkSecondary,
                        }}
                      >
                        Open Window Available
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#0075de",
                        backgroundColor: "rgba(0, 117, 222, 0.08)",
                        padding: "4px 10px",
                        borderRadius: theme.radii.full,
                      }}
                    >
                      AI Recommended
                    </span>
                  </div>
                ) : (
                  /* f172+: Blue Focus Block Dropped In */
                  <div
                    style={{
                      backgroundColor: "#0075de",
                      color: "#ffffff",
                      borderRadius: 10,
                      padding: "16px 20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      boxShadow: "0 8px 24px rgba(0, 117, 222, 0.4)",
                      transform: `translateY(${blockTranslateY}px) scale(${blockScale})`,
                      transformOrigin: "center center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "rgba(255, 255, 255, 0.85)",
                          letterSpacing: "0.4px",
                        }}
                      >
                        03:45 PM - 04:30 PM • FOCUS BLOCK
                      </div>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          backgroundColor: "#ffffff",
                          color: "#0075de",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Check size={14} strokeWidth={3} />
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#ffffff",
                        lineHeight: 1.25,
                      }}
                    >
                      Focus: Raft Consensus &amp; 18 Cards
                    </div>

                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 500,
                        color: "rgba(255, 255, 255, 0.85)",
                      }}
                    >
                      45m Timer Linked • Flashcards Queued
                    </div>
                  </div>
                )}
              </div>

              {/* Event 3: 05:00 PM - 06:00 PM */}
              <div
                style={{
                  backgroundColor: "rgba(26, 174, 57, 0.08)",
                  borderLeft: "4px solid #1aae39",
                  borderRadius: "0 10px 10px 0",
                  padding: "14px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#1aae39",
                    letterSpacing: "0.2px",
                  }}
                >
                  05:00 PM - 06:00 PM • GROUP STUDY
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: theme.colors.ink,
                    lineHeight: 1.25,
                  }}
                >
                  Algorithm Study Group
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: theme.colors.inkSecondary,
                  }}
                >
                  Library Room 4B
                </div>
              </div>
            </div>
          </div>
        </BrowserWindow>

        {/* FakeCursor interacting with input & Confirm button */}
        <FakeCursor keyframes={cursorKeyframes} />
      </div>
    </AbsoluteFill>
  );
};
