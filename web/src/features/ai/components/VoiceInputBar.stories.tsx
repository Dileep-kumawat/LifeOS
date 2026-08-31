import type { Meta, StoryObj } from "@storybook/react";
import { VoiceInputBar } from "./VoiceInputBar";

/**
 * VoiceInputBar provides the 3-state inline voice command input affordance (FR-9.1, FR-9.2, FR-9.3)
 * embedded directly inside the chat interface on Web and Mobile:
 * 1. Idle (Microphone button ready in text input bar)
 * 2. Recording (Real-time audio level waveform with Cancel and Confirm actions)
 * 3. Brief Inline Messages (Permission Denied and Empty Transcript feedback)
 */
const meta: Meta<typeof VoiceInputBar> = {
  title: "AI/VoiceInputBar",
  component: VoiceInputBar,
  tags: ["autodocs"],
  argTypes: {
    isRecording: {
      control: "boolean",
      description: "Toggles between Idle input state and active Recording waveform"
    },
    input: {
      control: "text",
      description: "Current text input value (typed or transcribed from voice)"
    },
    inlineNotice: {
      control: "text",
      description: "Brief ephemeral inline notification (e.g. permission or empty speech notices)"
    },
    audioLevels: {
      control: "object",
      description: "Array of normalized audio frequency levels (0.0 to 1.0) driving the waveform bars"
    }
  }
};

export default meta;
type Story = StoryObj<typeof VoiceInputBar>;

// Mock active audio waveform levels for realistic rendering
const mockActiveWaveform = [
  0.15, 0.28, 0.45, 0.72, 0.88, 0.65, 0.95, 0.82, 0.58, 0.9, 0.75, 0.4, 0.22, 0.12
];

const mockLoudWaveform = [
  0.4, 0.6, 0.85, 1.0, 0.95, 0.7, 0.9, 1.0, 0.8, 0.95, 0.85, 0.6, 0.45, 0.3
];

/**
 * 1. Idle State: Default chat input capsule with inline Mic icon waiting for voice input
 */
export const Idle: Story = {
  args: {
    isRecording: false,
    input: "",
    placeholder: "Message LifeOS AI...",
    inlineNotice: null
  }
};

/**
 * 1b. Idle With Typed/Transcribed Text: Shows the solid Send button (ArrowUp) once input is present
 */
export const IdleWithText: Story = {
  args: {
    isRecording: false,
    input: "Add a task for tomorrow at 5pm",
    placeholder: "Message LifeOS AI...",
    inlineNotice: null
  }
};

/**
 * 2. Recording State: Live audio-reactive waveform with Cancel (X) and Finish (Checkmark) controls
 */
export const Recording: Story = {
  args: {
    isRecording: true,
    audioLevels: mockActiveWaveform,
    inlineNotice: null
  }
};

/**
 * 2b. Recording State (Loud Audio): High-amplitude waveform bars simulating continuous speech
 */
export const RecordingHighVolume: Story = {
  args: {
    isRecording: true,
    audioLevels: mockLoudWaveform,
    inlineNotice: null
  }
};

/**
 * 3a. Inline Notice - Permission Denied: Brief inline feedback when microphone access was blocked
 */
export const PermissionDenied: Story = {
  args: {
    isRecording: false,
    input: "",
    inlineNotice: "Mic access is needed for voice input — enable it in settings"
  }
};

/**
 * 3b. Inline Notice - Empty Transcript: Brief inline feedback when no speech was detected
 */
export const EmptyTranscript: Story = {
  args: {
    isRecording: false,
    input: "",
    inlineNotice: "Didn't catch that — try again"
  }
};
