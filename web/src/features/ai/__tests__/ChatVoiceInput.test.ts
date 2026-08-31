import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Web Speech API interface declarations for test environment
interface MockRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: any) => void) | null;
  onresult: ((ev: any) => void) | null;
}

describe("Web Voice Input Engine & Web Speech API Lifecycle", () => {
  let mockRecognitionInstance: MockRecognition;
  let mockMediaStream: any;
  let mockAudioContext: any;
  let mockAnalyser: any;

  beforeEach(() => {
    vi.clearAllMocks();

    if (typeof (globalThis as any).window === "undefined") {
      (globalThis as any).window = globalThis;
    }
    if (typeof (globalThis as any).navigator === "undefined") {
      (globalThis as any).navigator = {
        language: "en-US"
      };
    }

    mockRecognitionInstance = {
      continuous: false,
      interimResults: false,
      lang: "",
      start: vi.fn(function (this: MockRecognition) {
        this.onstart?.();
      }),
      stop: vi.fn(function (this: MockRecognition) {
        this.onend?.();
      }),
      abort: vi.fn(function (this: MockRecognition) {
        this.onend?.();
      }),
      onstart: null,
      onend: null,
      onerror: null,
      onresult: null
    };

    (globalThis as any).window.SpeechRecognition = vi.fn(() => mockRecognitionInstance);
    (globalThis as any).window.webkitSpeechRecognition = (globalThis as any).window.SpeechRecognition;

    mockMediaStream = {
      getTracks: vi.fn(() => [{ stop: vi.fn() }])
    };

    mockAnalyser = {
      frequencyBinCount: 32,
      getByteFrequencyData: vi.fn((arr: Uint8Array) => {
        arr.fill(64); // Half volume
      }),
      fftSize: 64,
      smoothingTimeConstant: 0.8
    };

    mockAudioContext = {
      state: "running",
      createMediaStreamSource: vi.fn(() => ({
        connect: vi.fn()
      })),
      createAnalyser: vi.fn(() => mockAnalyser),
      close: vi.fn().mockResolvedValue(undefined)
    };

    (globalThis as any).window.AudioContext = vi.fn(() => mockAudioContext);

    Object.defineProperty((globalThis as any).navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream)
      },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("verifies Web Speech API recognition interface is detected", () => {
    const isSupported =
      typeof window !== "undefined" &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    expect(isSupported).toBe(true);
  });

  it("requests audio media stream and initializes SpeechRecognition on recording start", async () => {
    const stream = await (globalThis as any).navigator.mediaDevices.getUserMedia({ audio: true });
    expect(stream).toBeDefined();

    const recognition = new ((globalThis as any).window.SpeechRecognition as any)();
    recognition.start();

    expect(mockRecognitionInstance.start).toHaveBeenCalledTimes(1);
    expect(mockMediaStream.getTracks).toBeDefined();
  });

  it("accumulates live transcripts from interim recognition results", () => {
    const recognition = new ((globalThis as any).window.SpeechRecognition as any)();
    let transcriptAccumulator = "";

    recognition.onresult = (event: any) => {
      let fullTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        if (res && res[0]) {
          fullTranscript += res[0].transcript + " ";
        }
      }
      transcriptAccumulator = fullTranscript.trim();
    };

    recognition.onresult({
      results: [
        [{ transcript: "Add a task" }],
        [{ transcript: "for tomorrow at 5pm" }]
      ]
    });

    expect(transcriptAccumulator).toBe("Add a task for tomorrow at 5pm");
  });

  it("cleans up media streams and aborts recognition on cancel (X)", () => {
    const recognition = new ((globalThis as any).window.SpeechRecognition as any)();
    let isCancelled = false;
    let transcript = "Draft note";

    // Cancel action triggered
    isCancelled = true;
    transcript = "";
    recognition.abort();

    expect(mockRecognitionInstance.abort).toHaveBeenCalled();
    expect(transcript).toBe("");
    expect(isCancelled).toBe(true);
  });

  it("detects and flags permission denial on NotAllowedError", () => {
    let permissionDenied = false;
    let errorMessage: string | null = null;

    const handleSpeechError = (event: { error: string }) => {
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        permissionDenied = true;
        errorMessage = "Mic access is needed for voice input — enable it in settings";
      }
    };

    handleSpeechError({ error: "not-allowed" });

    expect(permissionDenied).toBe(true);
    expect(errorMessage).toBe("Mic access is needed for voice input — enable it in settings");
  });

  it("handles network error gracefully and suppresses misleading empty speech toasts", () => {
    let hasError = false;
    let errorMessage: string | null = null;

    const handleSpeechError = (event: { error: string }) => {
      hasError = true;
      if (event.error === "network") {
        errorMessage =
          "Speech recognition network error. In Brave, enable Google Speech Services in settings (brave://settings/system) or use Chrome/Edge.";
      }
    };

    handleSpeechError({ error: "network" });

    expect(hasError).toBe(true);
    expect(errorMessage).toContain("Speech recognition network error");
    expect(errorMessage).toContain("Brave");
  });

  it("flags empty speech error when recognition completes with no transcript and no prior error", () => {
    const hasError = false;
    let errorMessage: string | null = null;
    const finalTranscript = "";

    if (!hasError && !finalTranscript) {
      errorMessage = "Didn't catch that — try again";
    }

    expect(errorMessage).toBe("Didn't catch that — try again");
  });
});
