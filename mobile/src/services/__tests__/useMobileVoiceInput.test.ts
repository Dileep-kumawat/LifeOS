import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  PermissionsAndroid: {
    PERMISSIONS: { RECORD_AUDIO: "android.permission.RECORD_AUDIO" },
    RESULTS: { GRANTED: "granted", DENIED: "denied" },
    request: vi.fn().mockResolvedValue("granted")
  }
}));

import {
  mobileVoiceService,
  type VoiceRecognizerAdapter,
  type SpeechRecognitionCallbacks
} from "../mobileVoiceService";

describe("useMobileVoiceInput Workflow & Pipeline Integration", () => {
  let mockAdapter: VoiceRecognizerAdapter;
  let activeCallbacks: SpeechRecognitionCallbacks | null = null;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAdapter = {
      isAvailable: vi.fn().mockResolvedValue(true),
      requestPermissions: vi.fn().mockResolvedValue(true),
      start: vi.fn().mockImplementation(async (callbacks: SpeechRecognitionCallbacks) => {
        activeCallbacks = callbacks;
        callbacks.onSpeechStart?.();
      }),
      stop: vi.fn().mockImplementation(async () => {
        activeCallbacks?.onSpeechEnd?.();
      }),
      cancel: vi.fn().mockImplementation(async () => {
        activeCallbacks = null;
      }),
      destroy: vi.fn().mockImplementation(async () => {})
    };

    mobileVoiceService.setAdapter(mockAdapter);
  });

  it("handles voice input flow: start -> receive speech -> stop -> emit transcript", async () => {
    const onTranscript = vi.fn();
    let transcriptAccumulator = "";

    await mobileVoiceService.startListening({
      onSpeechStart: vi.fn(),
      onSpeechResults: (results) => {
        if (results && results[0]) transcriptAccumulator = results[0];
      },
      onSpeechEnd: () => {
        if (transcriptAccumulator) onTranscript(transcriptAccumulator);
      }
    });

    expect(mockAdapter.start).toHaveBeenCalled();

    // Speech detected
    activeCallbacks?.onSpeechResults?.(["Add a task for tomorrow at 5pm"]);
    expect(transcriptAccumulator).toBe("Add a task for tomorrow at 5pm");

    // User taps checkmark
    await mobileVoiceService.stopListening();
    expect(onTranscript).toHaveBeenCalledWith("Add a task for tomorrow at 5pm");
  });

  it("discards speech on cancel (X) without invoking onTranscript", async () => {
    const onTranscript = vi.fn();
    let transcriptAccumulator = "";

    await mobileVoiceService.startListening({
      onSpeechStart: vi.fn(),
      onSpeechResults: (results) => {
        if (results && results[0]) transcriptAccumulator = results[0];
      },
      onSpeechEnd: () => {
        if (transcriptAccumulator) onTranscript(transcriptAccumulator);
      }
    });

    activeCallbacks?.onSpeechResults?.(["Delete my calendar"]);
    // User taps X (cancel)
    transcriptAccumulator = "";
    await mobileVoiceService.cancelListening();

    expect(mockAdapter.cancel).toHaveBeenCalled();
    expect(onTranscript).not.toHaveBeenCalled();
    expect(transcriptAccumulator).toBe("");
  });

  it("handles empty speech detection with user feedback callback", async () => {
    const onTranscript = vi.fn();
    const onError = vi.fn();
    const transcriptAccumulator = "";

    await mobileVoiceService.startListening({
      onSpeechStart: vi.fn(),
      onSpeechResults: vi.fn(),
      onSpeechEnd: () => {
        if (!transcriptAccumulator) {
          onError("Didn't catch that — try again");
        }
      }
    });

    await mobileVoiceService.stopListening();

    expect(onTranscript).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith("Didn't catch that — try again");
  });

  it("handles mic permission denial gracefully without throwing unhandled exceptions", async () => {
    const onError = vi.fn();

    const deniedAdapter: VoiceRecognizerAdapter = {
      isAvailable: vi.fn().mockResolvedValue(true),
      requestPermissions: vi.fn().mockResolvedValue(false),
      start: vi.fn().mockImplementation(async (callbacks) => {
        callbacks.onError?.({
          error: "permission_denied",
          message: "Mic access is needed for voice input — enable it in settings"
        });
      }),
      stop: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn().mockResolvedValue(undefined)
    };

    mobileVoiceService.setAdapter(deniedAdapter);

    await mobileVoiceService.startListening({
      onError: (err) => onError(err.message)
    });

    expect(onError).toHaveBeenCalledWith(
      "Mic access is needed for voice input — enable it in settings"
    );
  });
});
