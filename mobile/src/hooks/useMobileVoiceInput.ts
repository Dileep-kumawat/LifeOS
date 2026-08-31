import { useState, useRef, useCallback, useEffect } from "react";
import { mobileVoiceService } from "../services/mobileVoiceService";

export interface UseMobileVoiceInputOptions {
  onTranscript?: (transcript: string) => void;
  onError?: (errorMessage: string) => void;
  barCount?: number;
}

export interface UseMobileVoiceInputReturn {
  isRecording: boolean;
  audioLevels: number[];
  errorMessage: string | null;
  permissionDenied: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
}

export const useMobileVoiceInput = ({
  onTranscript,
  onError,
  barCount = 24
}: UseMobileVoiceInputOptions = {}): UseMobileVoiceInputReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(() =>
    Array(barCount).fill(0.15)
  );

  const transcriptAccumulatorRef = useRef<string>("");
  const isCancelledRef = useRef<boolean>(false);

  // Generate responsive bars from volume amplitude
  const updateBarsFromVolume = useCallback(
    (volume: number) => {
      const newLevels: number[] = [];
      const mid = Math.floor(barCount / 2);

      for (let i = 0; i < barCount; i++) {
        // Distance from center bell curve factor
        const distFromCenter = Math.abs(i - mid) / mid;
        const bellFactor = Math.cos((distFromCenter * Math.PI) / 2.2);
        const noise = (Math.random() - 0.5) * 0.15;
        const height = Math.max(
          0.1,
          Math.min(1.0, volume * bellFactor + noise)
        );
        newLevels.push(height);
      }
      setAudioLevels(newLevels);
    },
    [barCount]
  );

  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    transcriptAccumulatorRef.current = "";
    isCancelledRef.current = false;

    try {
      await mobileVoiceService.startListening({
        onSpeechStart: () => {
          setIsRecording(true);
        },
        onSpeechResults: (results) => {
          if (results && results.length > 0) {
            transcriptAccumulatorRef.current = results[0].trim();
          }
        },
        onSpeechPartialResults: (results) => {
          if (results && results.length > 0) {
            transcriptAccumulatorRef.current = results[0].trim();
          }
        },
        onSpeechVolumeChanged: (volume) => {
          updateBarsFromVolume(volume);
        },
        onError: (err) => {
          if (err.error === "permission_denied") {
            setPermissionDenied(true);
            const deniedMsg =
              "Mic access is needed for voice input — enable it in settings";
            setErrorMessage(deniedMsg);
            onError?.(deniedMsg);
          } else if (err.error !== "no_speech") {
            const msg = err.message || `Voice input error: ${err.error}`;
            setErrorMessage(msg);
            onError?.(msg);
          }
        },
        onSpeechEnd: () => {
          setIsRecording(false);
          setAudioLevels(Array(barCount).fill(0.15));

          if (isCancelledRef.current) {
            isCancelledRef.current = false;
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
        }
      });
    } catch (err: any) {
      setIsRecording(false);
      const msg = err.message || "Failed to start voice recognition";
      setErrorMessage(msg);
      onError?.(msg);
    }
  }, [barCount, onError, onTranscript, permissionDenied, updateBarsFromVolume]);

  const stopRecording = useCallback(async () => {
    isCancelledRef.current = false;
    await mobileVoiceService.stopListening();
    setIsRecording(false);
    setAudioLevels(Array(barCount).fill(0.15));

    const finalTranscript = transcriptAccumulatorRef.current.trim();
    if (finalTranscript) {
      onTranscript?.(finalTranscript);
    } else {
      const noSpeechMsg = "Didn't catch that — try again";
      setErrorMessage(noSpeechMsg);
      onError?.(noSpeechMsg);
    }
  }, [barCount, onError, onTranscript]);

  const cancelRecording = useCallback(async () => {
    isCancelledRef.current = true;
    transcriptAccumulatorRef.current = "";
    await mobileVoiceService.cancelListening();
    setIsRecording(false);
    setAudioLevels(Array(barCount).fill(0.15));
  }, [barCount]);

  useEffect(() => {
    return () => {
      mobileVoiceService.cancelListening().catch(() => {});
    };
  }, []);

  return {
    isRecording,
    audioLevels,
    errorMessage,
    permissionDenied,
    startRecording,
    stopRecording,
    cancelRecording
  };
};
