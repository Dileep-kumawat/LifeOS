import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import { mobileOcrService, type MobileOcrOptions } from "../services/mobileOcrService";
import type { OcrExtractionResult } from "@lifeos/shared";

export interface OcrCaptureState {
  isCapturing: boolean;
  isProcessing: boolean;
  error: string | null;
  lastResult: OcrExtractionResult | null;
  lastImageUri: string | null;
}

export interface UseOcrCaptureReturn extends OcrCaptureState {
  /**
   * Request camera permissions and launch device camera to capture an image and extract text.
   */
  captureFromCamera: (options?: MobileOcrOptions) => Promise<OcrExtractionResult | null>;
  /**
   * Request media library permissions and open image gallery to select an image and extract text.
   */
  pickFromGallery: (options?: MobileOcrOptions) => Promise<OcrExtractionResult | null>;
  /**
   * Extract text directly from an existing image URI.
   */
  extractFromUri: (imageUri: string, options?: MobileOcrOptions) => Promise<OcrExtractionResult | null>;
  /**
   * Reset capture state.
   */
  reset: () => void;
}

export function useOcrCapture(): UseOcrCaptureReturn {
  const [state, setState] = useState<OcrCaptureState>({
    isCapturing: false,
    isProcessing: false,
    error: null,
    lastResult: null,
    lastImageUri: null
  });

  const reset = useCallback(() => {
    setState({
      isCapturing: false,
      isProcessing: false,
      error: null,
      lastResult: null,
      lastImageUri: null
    });
  }, []);

  const extractFromUri = useCallback(
    async (imageUri: string, options?: MobileOcrOptions): Promise<OcrExtractionResult | null> => {
      setState((prev) => ({
        ...prev,
        isProcessing: true,
        error: null,
        lastImageUri: imageUri
      }));

      try {
        const result = await mobileOcrService.extractText(imageUri, options);
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          lastResult: result,
          error: null
        }));
        return result;
      } catch (err: any) {
        const message = err?.message || "Failed to extract text from image";
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: message
        }));
        return null;
      }
    },
    []
  );

  const captureFromCamera = useCallback(
    async (options?: MobileOcrOptions): Promise<OcrExtractionResult | null> => {
      setState((prev) => ({ ...prev, isCapturing: true, error: null }));

      try {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setState((prev) => ({
            ...prev,
            isCapturing: false,
            error: "Camera permission denied"
          }));
          return null;
        }

        const pickerResult = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
          allowsEditing: false
        });

        if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) {
          setState((prev) => ({ ...prev, isCapturing: false }));
          return null;
        }

        const imageUri = pickerResult.assets[0].uri;
        setState((prev) => ({ ...prev, isCapturing: false }));

        return await extractFromUri(imageUri, options);
      } catch (err: any) {
        const message = err?.message || "Failed to capture image with camera";
        setState((prev) => ({
          ...prev,
          isCapturing: false,
          isProcessing: false,
          error: message
        }));
        return null;
      }
    },
    [extractFromUri]
  );

  const pickFromGallery = useCallback(
    async (options?: MobileOcrOptions): Promise<OcrExtractionResult | null> => {
      setState((prev) => ({ ...prev, isCapturing: true, error: null }));

      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setState((prev) => ({
            ...prev,
            isCapturing: false,
            error: "Media library permission denied"
          }));
          return null;
        }

        const pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
          allowsEditing: false
        });

        if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) {
          setState((prev) => ({ ...prev, isCapturing: false }));
          return null;
        }

        const imageUri = pickerResult.assets[0].uri;
        setState((prev) => ({ ...prev, isCapturing: false }));

        return await extractFromUri(imageUri, options);
      } catch (err: any) {
        const message = err?.message || "Failed to select image from library";
        setState((prev) => ({
          ...prev,
          isCapturing: false,
          isProcessing: false,
          error: message
        }));
        return null;
      }
    },
    [extractFromUri]
  );

  return {
    ...state,
    captureFromCamera,
    pickFromGallery,
    extractFromUri,
    reset
  };
}
