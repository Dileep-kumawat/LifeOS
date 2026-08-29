import { apiClient } from "./apiClient";
import type {
  OcrExtractionResult,
  OcrBlock,
  OcrLine,
  OcrBoundingBox
} from "@lifeos/shared";

/**
 * Mobile ML Kit Recognition Response Shape (standard React Native ML Kit format)
 */
export interface MlKitNativeBlock {
  text: string;
  frame?: { x: number; y: number; width: number; height: number };
  boundingBox?: { left: number; top: number; width: number; height: number };
  confidence?: number;
  lines?: Array<{
    text: string;
    frame?: { x: number; y: number; width: number; height: number };
    boundingBox?: { left: number; top: number; width: number; height: number };
    confidence?: number;
  }>;
}

export interface MlKitNativeResult {
  text: string;
  blocks?: MlKitNativeBlock[];
}

export interface MobileOcrOptions {
  /**
   * If true, automatically attempts server fallback when on-device OCR fails
   * or returns empty/low-quality extracted text. Default: true.
   */
  fallbackToServerOnFailure?: boolean;
  /**
   * Optional confidence threshold (0.0 - 1.0). If on-device extraction is
   * below this threshold and fallback is enabled, tries server fallback.
   */
  minConfidenceThreshold?: number;
  /**
   * Optional custom ML Kit adapter (useful for dependency injection and tests).
   */
  recognizerAdapter?: (imageUri: string) => Promise<MlKitNativeResult>;
}

function parseBoundingBox(rawFrame: any): OcrBoundingBox | undefined {
  if (!rawFrame) return undefined;
  const x = typeof rawFrame.x === "number" ? rawFrame.x : typeof rawFrame.left === "number" ? rawFrame.left : 0;
  const y = typeof rawFrame.y === "number" ? rawFrame.y : typeof rawFrame.top === "number" ? rawFrame.top : 0;
  const width = typeof rawFrame.width === "number" ? rawFrame.width : 0;
  const height = typeof rawFrame.height === "number" ? rawFrame.height : 0;
  return { x, y, width, height };
}

/**
 * Default on-device text recognizer adapter.
 * Tries dynamic import of native ML Kit text recognition module if installed/linked,
 * with safe fallback if running in environments without native binary bindings.
 */
export async function defaultMlKitRecognizer(imageUri: string): Promise<MlKitNativeResult> {
  try {
    // Attempt dynamic resolution of @react-native-ml-kit/text-recognition if available in native runtime
    const mlkitModule = await import(
      /* webpackIgnore: true */ "@react-native-ml-kit/text-recognition" as any
    ).catch(() => null);

    if (mlkitModule && typeof mlkitModule.default?.recognize === "function") {
      const nativeRes = await mlkitModule.default.recognize(imageUri);
      return nativeRes;
    }
  } catch (_err) {
    // Native module not linked in current environment (e.g. standard Expo Go or web)
  }

  throw new Error("On-device ML Kit text recognition module is not linked or unavailable in this environment");
}

/**
 * Maps ML Kit native result into the LifeOS unified OcrExtractionResult shape.
 */
export function mapMlKitResultToUnified(
  nativeResult: MlKitNativeResult,
  processingTimeMs?: number
): OcrExtractionResult {
  const extractedText = (nativeResult.text || "").trim();
  const rawBlocks = nativeResult.blocks || [];

  let totalConfidence = 0;
  let lineCount = 0;

  const blocks: OcrBlock[] = rawBlocks.map((b) => {
    const blockBbox = parseBoundingBox(b.frame || b.boundingBox);

    const lines: OcrLine[] = (b.lines || []).map((l) => {
      const lineBbox = parseBoundingBox(l.frame || l.boundingBox);

      // Normalize confidence score (0-100 or 0.0-1.0)
      let conf = typeof l.confidence === "number" ? l.confidence : 0.9;
      if (conf > 1) conf = conf / 100;
      conf = Math.max(0, Math.min(1, conf));

      totalConfidence += conf;
      lineCount++;

      return {
        text: (l.text || "").trim(),
        confidence: conf,
        boundingBox: lineBbox
      };
    });

    let bConf = typeof b.confidence === "number" ? b.confidence : 0.9;
    if (bConf > 1) bConf = bConf / 100;
    bConf = Math.max(0, Math.min(1, bConf));

    return {
      text: (b.text || "").trim(),
      confidence: bConf,
      boundingBox: blockBbox,
      lines
    };
  });

  const overallConfidence = lineCount > 0 ? totalConfidence / lineCount : blocks.length > 0 ? 0.9 : 0.0;
  const normalizedOverallConfidence = Math.max(0, Math.min(1, Math.round(overallConfidence * 100) / 100));

  return {
    extractedText,
    confidence: normalizedOverallConfidence,
    source: "on_device",
    blocks,
    metadata: {
      processingTimeMs,
      engine: "mlkit_on_device"
    }
  };
}

/**
 * Mobile OCR Service
 *
 * Provides on-device ML Kit recognition as the primary, fast, free, local path.
 * When on-device extraction is unavailable or yields empty/low-quality text,
 * seamlessly delegates to the server-side queue fallback.
 */
export const mobileOcrService = {
  /**
   * Run server-side fallback OCR extraction via LifeOS API
   */
  async extractViaServerFallback(
    imageUri: string,
    base64Data?: string,
    mimeType: string = "image/jpeg"
  ): Promise<OcrExtractionResult> {
    if (base64Data) {
      const response = await apiClient.post<OcrExtractionResult>("/ocr/extract", {
        imageBase64: base64Data,
        mimeType,
        async: false
      });
      return response.data;
    }

    // Prepare FormData multipart upload
    const formData = new FormData();
    const filename = imageUri.split("/").pop() || "upload.jpg";
    
    // React Native FormData file object format
    formData.append("image", {
      uri: imageUri,
      type: mimeType,
      name: filename
    } as any);

    const response = await apiClient.post<OcrExtractionResult>("/ocr/extract", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    return response.data;
  },

  /**
   * Extract text from local image URI using on-device ML Kit,
   * falling back to server-side OCR if configured and needed.
   */
  async extractText(
    imageUri: string,
    options: MobileOcrOptions = {}
  ): Promise<OcrExtractionResult> {
    const {
      fallbackToServerOnFailure = true,
      minConfidenceThreshold = 0.3,
      recognizerAdapter = defaultMlKitRecognizer
    } = options;

    const startTime = Date.now();

    try {
      const nativeResult = await recognizerAdapter(imageUri);
      const unifiedResult = mapMlKitResultToUnified(nativeResult, Date.now() - startTime);

      const hasText = unifiedResult.extractedText.length > 0;
      const meetsConfidence = (unifiedResult.confidence ?? 1) >= minConfidenceThreshold;

      if (hasText && meetsConfidence) {
        return unifiedResult;
      }

      if (!fallbackToServerOnFailure) {
        return unifiedResult;
      }
    } catch (_onDeviceErr) {
      if (!fallbackToServerOnFailure) {
        throw _onDeviceErr;
      }
    }

    // Fallback path: Server-side OCR
    return await this.extractViaServerFallback(imageUri);
  }
};
