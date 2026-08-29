import { apiClient } from "../../lib/apiClient";
import type { OcrExtractionResult, OcrJobStatus } from "@lifeos/shared";

export const ocrApi = {
  /**
   * Uploads an image file to the LifeOS OCR server fallback extraction endpoint.
   */
  async extractFromFile(file: File | Blob): Promise<OcrExtractionResult> {
    const formData = new FormData();
    formData.append("image", file);

    const response = await apiClient.post<OcrExtractionResult | { jobId: string; status: string; pollUrl: string }>(
      "/ocr/extract",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      }
    );

    // If API responded with 202 Accepted and job ID, poll until completion
    if ("jobId" in response.data && !("extractedText" in response.data)) {
      return await this.pollJob(response.data.jobId);
    }

    return response.data as OcrExtractionResult;
  },

  /**
   * Uploads a base64 encoded image string to the OCR extraction endpoint.
   */
  async extractFromBase64(imageBase64: string, mimeType: string = "image/jpeg"): Promise<OcrExtractionResult> {
    const response = await apiClient.post<OcrExtractionResult | { jobId: string; status: string; pollUrl: string }>(
      "/ocr/extract",
      {
        imageBase64,
        mimeType,
        async: false
      }
    );

    if ("jobId" in response.data && !("extractedText" in response.data)) {
      return await this.pollJob(response.data.jobId);
    }

    return response.data as OcrExtractionResult;
  },

  /**
   * Polls an asynchronous OCR job until completed or failed.
   */
  async pollJob(jobId: string, maxAttempts: number = 20, intervalMs: number = 500): Promise<OcrExtractionResult> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await apiClient.get<OcrJobStatus>(`/ocr/extract/${jobId}`);
      const job = response.data;

      if (job.status === "completed" && job.result) {
        return job.result;
      }

      if (job.status === "failed") {
        throw new Error(job.error || "OCR processing failed");
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error("OCR extraction timed out. Please try again with a clearer image.");
  }
};
