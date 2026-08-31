import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  PermissionsAndroid: {
    PERMISSIONS: { RECORD_AUDIO: "android.permission.RECORD_AUDIO" },
    RESULTS: { GRANTED: "granted", DENIED: "denied" },
    request: vi.fn().mockResolvedValue("granted")
  }
}));

import { MobileVoiceService } from "../mobileVoiceService";
import type { VoiceRecognizerAdapter, SpeechRecognitionCallbacks } from "../mobileVoiceService";

describe("Mobile Voice Service & Speech Recognition Adapter", () => {
  let mockAdapter: VoiceRecognizerAdapter;
  let voiceService: MobileVoiceService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAdapter = {
      isAvailable: vi.fn().mockResolvedValue(true),
      requestPermissions: vi.fn().mockResolvedValue(true),
      start: vi.fn().mockImplementation(async (callbacks: SpeechRecognitionCallbacks) => {
        callbacks.onSpeechStart?.();
        callbacks.onSpeechVolumeChanged?.(0.65);
        callbacks.onSpeechResults?.(["Add a task for tomorrow at 5pm"]);
      }),
      stop: vi.fn().mockImplementation(async () => {}),
      cancel: vi.fn().mockImplementation(async () => {}),
      destroy: vi.fn().mockImplementation(async () => {})
    };

    voiceService = new MobileVoiceService({ adapter: mockAdapter });
  });

  it("checks availability and requests microphone permissions on device", async () => {
    const isAvail = await voiceService.isAvailable();
    const hasPerm = await voiceService.requestPermissions();

    expect(isAvail).toBe(true);
    expect(hasPerm).toBe(true);
    expect(mockAdapter.isAvailable).toHaveBeenCalledTimes(1);
    expect(mockAdapter.requestPermissions).toHaveBeenCalledTimes(1);
  });

  it("starts speech recognition and propagates volume metering and speech results", async () => {
    const onStart = vi.fn();
    const onVolume = vi.fn();
    const onResults = vi.fn();

    await voiceService.startListening({
      onSpeechStart: onStart,
      onSpeechVolumeChanged: onVolume,
      onSpeechResults: onResults
    });

    expect(mockAdapter.start).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onVolume).toHaveBeenCalledWith(0.65);
    expect(onResults).toHaveBeenCalledWith(["Add a task for tomorrow at 5pm"]);
  });

  it("delegates stopListening to the underlying adapter", async () => {
    await voiceService.stopListening();
    expect(mockAdapter.stop).toHaveBeenCalledTimes(1);
  });

  it("delegates cancelListening to abort recording and discard partial state", async () => {
    await voiceService.cancelListening();
    expect(mockAdapter.cancel).toHaveBeenCalledTimes(1);
  });

  it("handles permission denial from adapter cleanly with error callback", async () => {
    const denyingAdapter: VoiceRecognizerAdapter = {
      isAvailable: vi.fn().mockResolvedValue(true),
      requestPermissions: vi.fn().mockResolvedValue(false),
      start: vi.fn().mockImplementation(async (callbacks: SpeechRecognitionCallbacks) => {
        callbacks.onError?.({
          error: "permission_denied",
          message: "Mic access is needed for voice input — enable it in settings"
        });
      }),
      stop: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn().mockResolvedValue(undefined)
    };

    const svc = new MobileVoiceService({ adapter: denyingAdapter });
    const onError = vi.fn();

    await svc.startListening({ onError });

    expect(onError).toHaveBeenCalledWith({
      error: "permission_denied",
      message: "Mic access is needed for voice input — enable it in settings"
    });
  });

  it("handles empty speech results gracefully without crashing", async () => {
    const emptyAdapter: VoiceRecognizerAdapter = {
      isAvailable: vi.fn().mockResolvedValue(true),
      requestPermissions: vi.fn().mockResolvedValue(true),
      start: vi.fn().mockImplementation(async (callbacks: SpeechRecognitionCallbacks) => {
        callbacks.onSpeechStart?.();
        callbacks.onSpeechResults?.([]);
        callbacks.onSpeechEnd?.();
      }),
      stop: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn().mockResolvedValue(undefined)
    };

    const svc = new MobileVoiceService({ adapter: emptyAdapter });
    const onResults = vi.fn();
    const onEnd = vi.fn();

    await svc.startListening({
      onSpeechResults: onResults,
      onSpeechEnd: onEnd
    });

    expect(onResults).toHaveBeenCalledWith([]);
    expect(onEnd).toHaveBeenCalled();
  });
});
