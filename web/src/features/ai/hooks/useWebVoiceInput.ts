import { useState, useRef, useCallback, useEffect } from "react";

// Web Speech API interface declarations for browser compatibility
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => any) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: {
      new (): SpeechRecognitionInstance;
    };
    webkitSpeechRecognition?: {
      new (): SpeechRecognitionInstance;
    };
  }
}

export interface UseWebVoiceInputOptions {
  onTranscript?: (transcript: string) => void;
  onError?: (errorMessage: string) => void;
  barCount?: number;
}

export interface UseWebVoiceInputReturn {
  isRecording: boolean;
  isSupported: boolean;
  audioLevels: number[];
  errorMessage: string | null;
  permissionDenied: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
}

export const useWebVoiceInput = ({
  onTranscript,
  onError,
  barCount = 28
}: UseWebVoiceInputOptions = {}): UseWebVoiceInputReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(() =>
    Array(barCount).fill(0.1)
  );

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const transcriptAccumulatorRef = useRef<string>("");
  const isCancelledRef = useRef<boolean>(false);
  const hasErrorRef = useRef<boolean>(false);

  // Check Web Speech API support (Note: Chrome & Edge have full native support; Safari & Firefox support varies)
  const isSupported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Clean up all audio streams and analyzers
  const cleanupAudio = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setAudioLevels(Array(barCount).fill(0.1));
  }, [barCount]);

  // Audio level analyzer loop for live waveform rendering
  const updateAudioLevels = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Compute distributed bars from frequency spectrum
    const step = Math.floor(bufferLength / barCount);
    const newLevels: number[] = [];

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      const start = i * step;
      const end = start + step;
      for (let j = start; j < end && j < bufferLength; j++) {
        sum += dataArray[j];
      }
      const avg = sum / (step || 1);
      // Normalized between 0.08 and 1.0 for aesthetic waveform rendering
      const normalized = Math.max(0.08, Math.min(1.0, avg / 128));
      newLevels.push(normalized);
    }

    setAudioLevels(newLevels);
    animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
  }, [barCount]);

  // Start live voice recording
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      const msg = "Voice input is not supported in this browser. Please use Chrome or Edge.";
      setErrorMessage(msg);
      onError?.(msg);
      return;
    }

    setErrorMessage(null);
    transcriptAccumulatorRef.current = "";
    isCancelledRef.current = false;
    hasErrorRef.current = false;

    try {
      // 1. Request microphone permission and initialize Web Audio analyser
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      mediaStreamRef.current = stream;
      setPermissionDenied(false);

      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyserRef.current = analyser;

        updateAudioLevels();
      }

      // 2. Initialize and start Web Speech Recognition
      const SpeechRecognitionClass =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionClass) {
        throw new Error("SpeechRecognition not found");
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || "en-US";

      recognition.onstart = () => {
        setIsRecording(true);
        hasErrorRef.current = false;
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res && res[0]) {
            fullTranscript += res[0].transcript + " ";
          }
        }
        if (fullTranscript.trim()) {
          transcriptAccumulatorRef.current = fullTranscript.trim();
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        hasErrorRef.current = true;
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setPermissionDenied(true);
          const deniedMsg =
            "Mic access is needed for voice input — enable it in settings";
          setErrorMessage(deniedMsg);
          onError?.(deniedMsg);
        } else if (event.error === "network") {
          const networkMsg =
            "Speech recognition network error. In Brave, enable Google Speech Services in settings (brave://settings/system) or use Chrome/Edge.";
          setErrorMessage(networkMsg);
          onError?.(networkMsg);
        } else if (event.error === "no-speech") {
          const noSpeechMsg = "Didn't catch that — try again";
          setErrorMessage(noSpeechMsg);
          onError?.(noSpeechMsg);
        } else if (event.error !== "aborted") {
          const err = `Speech recognition error: ${event.error}`;
          setErrorMessage(err);
          onError?.(err);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        cleanupAudio();

        if (isCancelledRef.current) {
          isCancelledRef.current = false;
          return;
        }

        // If an explicit error already fired (e.g. network or not-allowed), do not emit "Didn't catch that"
        if (hasErrorRef.current) {
          return;
        }

        const finalTranscript = transcriptAccumulatorRef.current.trim();
        if (finalTranscript) {
          onTranscript?.(finalTranscript);
        } else if (!permissionDenied) {
          const noSpeechMsg = "Didn't catch that — try again";
          setErrorMessage(noSpeechMsg);
          onError?.(noSpeechMsg);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      cleanupAudio();
      setIsRecording(false);
      hasErrorRef.current = true;

      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError" ||
        err.message?.includes("Permission")
      ) {
        setPermissionDenied(true);
        const deniedMsg =
          "Mic access is needed for voice input — enable it in settings";
        setErrorMessage(deniedMsg);
        onError?.(deniedMsg);
      } else {
        const genMsg = err.message || "Failed to start microphone recording";
        setErrorMessage(genMsg);
        onError?.(genMsg);
      }
    }
  }, [isSupported, cleanupAudio, updateAudioLevels, onError, onTranscript, permissionDenied]);

  // Stop recording and proceed to transcription:
  // Note: We trigger recognition.stop() and let onend handle clean track shutdown
  // so the browser engine can finish processing in-flight audio frames without network cut-off.
  const stopRecording = useCallback(() => {
    isCancelledRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        setIsRecording(false);
        cleanupAudio();
      }
    } else {
      setIsRecording(false);
      cleanupAudio();
    }
  }, [cleanupAudio]);

  // Cancel / discard recording immediately with no side effects
  const cancelRecording = useCallback(() => {
    isCancelledRef.current = true;
    transcriptAccumulatorRef.current = "";
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Safe catch if already aborted
      }
    }
    setIsRecording(false);
    cleanupAudio();
  }, [cleanupAudio]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return {
    isRecording,
    isSupported,
    audioLevels,
    errorMessage,
    permissionDenied,
    startRecording,
    stopRecording,
    cancelRecording
  };
};
