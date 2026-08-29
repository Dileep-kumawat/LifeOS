import { z } from "zod";
export declare const ocrBoundingBoxSchema: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodNumber;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    x: number;
    y: number;
    width: number;
    height: number;
}, {
    x: number;
    y: number;
    width: number;
    height: number;
}>;
export type OcrBoundingBox = z.infer<typeof ocrBoundingBoxSchema>;
export declare const ocrLineSchema: z.ZodObject<{
    text: z.ZodString;
    confidence: z.ZodOptional<z.ZodNumber>;
    boundingBox: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        width: number;
        height: number;
    }, {
        x: number;
        y: number;
        width: number;
        height: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    text: string;
    confidence?: number | undefined;
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | undefined;
}, {
    text: string;
    confidence?: number | undefined;
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | undefined;
}>;
export type OcrLine = z.infer<typeof ocrLineSchema>;
export declare const ocrBlockSchema: z.ZodObject<{
    text: z.ZodString;
    confidence: z.ZodOptional<z.ZodNumber>;
    boundingBox: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        width: number;
        height: number;
    }, {
        x: number;
        y: number;
        width: number;
        height: number;
    }>>;
    lines: z.ZodOptional<z.ZodArray<z.ZodObject<{
        text: z.ZodString;
        confidence: z.ZodOptional<z.ZodNumber>;
        boundingBox: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
            width: number;
            height: number;
        }, {
            x: number;
            y: number;
            width: number;
            height: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        confidence?: number | undefined;
        boundingBox?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
    }, {
        text: string;
        confidence?: number | undefined;
        boundingBox?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    text: string;
    confidence?: number | undefined;
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | undefined;
    lines?: {
        text: string;
        confidence?: number | undefined;
        boundingBox?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
    }[] | undefined;
}, {
    text: string;
    confidence?: number | undefined;
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | undefined;
    lines?: {
        text: string;
        confidence?: number | undefined;
        boundingBox?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
    }[] | undefined;
}>;
export type OcrBlock = z.infer<typeof ocrBlockSchema>;
export declare const ocrExtractionResultSchema: z.ZodObject<{
    extractedText: z.ZodString;
    confidence: z.ZodOptional<z.ZodNumber>;
    source: z.ZodEnum<["on_device", "server_fallback"]>;
    blocks: z.ZodOptional<z.ZodArray<z.ZodObject<{
        text: z.ZodString;
        confidence: z.ZodOptional<z.ZodNumber>;
        boundingBox: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
            width: number;
            height: number;
        }, {
            x: number;
            y: number;
            width: number;
            height: number;
        }>>;
        lines: z.ZodOptional<z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            confidence: z.ZodOptional<z.ZodNumber>;
            boundingBox: z.ZodOptional<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
                width: z.ZodNumber;
                height: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x: number;
                y: number;
                width: number;
                height: number;
            }, {
                x: number;
                y: number;
                width: number;
                height: number;
            }>>;
        }, "strip", z.ZodTypeAny, {
            text: string;
            confidence?: number | undefined;
            boundingBox?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
        }, {
            text: string;
            confidence?: number | undefined;
            boundingBox?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        confidence?: number | undefined;
        boundingBox?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        lines?: {
            text: string;
            confidence?: number | undefined;
            boundingBox?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
        }[] | undefined;
    }, {
        text: string;
        confidence?: number | undefined;
        boundingBox?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        lines?: {
            text: string;
            confidence?: number | undefined;
            boundingBox?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
        }[] | undefined;
    }>, "many">>;
    metadata: z.ZodOptional<z.ZodObject<{
        processingTimeMs: z.ZodOptional<z.ZodNumber>;
        engine: z.ZodOptional<z.ZodString>;
        fileSize: z.ZodOptional<z.ZodNumber>;
        mimeType: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        processingTimeMs?: number | undefined;
        engine?: string | undefined;
        fileSize?: number | undefined;
        mimeType?: string | undefined;
    }, {
        processingTimeMs?: number | undefined;
        engine?: string | undefined;
        fileSize?: number | undefined;
        mimeType?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    extractedText: string;
    source: "on_device" | "server_fallback";
    confidence?: number | undefined;
    blocks?: {
        text: string;
        confidence?: number | undefined;
        boundingBox?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        lines?: {
            text: string;
            confidence?: number | undefined;
            boundingBox?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
        }[] | undefined;
    }[] | undefined;
    metadata?: {
        processingTimeMs?: number | undefined;
        engine?: string | undefined;
        fileSize?: number | undefined;
        mimeType?: string | undefined;
    } | undefined;
}, {
    extractedText: string;
    source: "on_device" | "server_fallback";
    confidence?: number | undefined;
    blocks?: {
        text: string;
        confidence?: number | undefined;
        boundingBox?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        lines?: {
            text: string;
            confidence?: number | undefined;
            boundingBox?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
        }[] | undefined;
    }[] | undefined;
    metadata?: {
        processingTimeMs?: number | undefined;
        engine?: string | undefined;
        fileSize?: number | undefined;
        mimeType?: string | undefined;
    } | undefined;
}>;
export type OcrExtractionResult = z.infer<typeof ocrExtractionResultSchema>;
export declare const ocrJobStatusSchema: z.ZodObject<{
    jobId: z.ZodString;
    status: z.ZodEnum<["pending", "processing", "completed", "failed"]>;
    error: z.ZodOptional<z.ZodString>;
    result: z.ZodOptional<z.ZodObject<{
        extractedText: z.ZodString;
        confidence: z.ZodOptional<z.ZodNumber>;
        source: z.ZodEnum<["on_device", "server_fallback"]>;
        blocks: z.ZodOptional<z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            confidence: z.ZodOptional<z.ZodNumber>;
            boundingBox: z.ZodOptional<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
                width: z.ZodNumber;
                height: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x: number;
                y: number;
                width: number;
                height: number;
            }, {
                x: number;
                y: number;
                width: number;
                height: number;
            }>>;
            lines: z.ZodOptional<z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                confidence: z.ZodOptional<z.ZodNumber>;
                boundingBox: z.ZodOptional<z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                    width: z.ZodNumber;
                    height: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                }, {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                }>>;
            }, "strip", z.ZodTypeAny, {
                text: string;
                confidence?: number | undefined;
                boundingBox?: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                } | undefined;
            }, {
                text: string;
                confidence?: number | undefined;
                boundingBox?: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                } | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            text: string;
            confidence?: number | undefined;
            boundingBox?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
            lines?: {
                text: string;
                confidence?: number | undefined;
                boundingBox?: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                } | undefined;
            }[] | undefined;
        }, {
            text: string;
            confidence?: number | undefined;
            boundingBox?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
            lines?: {
                text: string;
                confidence?: number | undefined;
                boundingBox?: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                } | undefined;
            }[] | undefined;
        }>, "many">>;
        metadata: z.ZodOptional<z.ZodObject<{
            processingTimeMs: z.ZodOptional<z.ZodNumber>;
            engine: z.ZodOptional<z.ZodString>;
            fileSize: z.ZodOptional<z.ZodNumber>;
            mimeType: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            processingTimeMs?: number | undefined;
            engine?: string | undefined;
            fileSize?: number | undefined;
            mimeType?: string | undefined;
        }, {
            processingTimeMs?: number | undefined;
            engine?: string | undefined;
            fileSize?: number | undefined;
            mimeType?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        extractedText: string;
        source: "on_device" | "server_fallback";
        confidence?: number | undefined;
        blocks?: {
            text: string;
            confidence?: number | undefined;
            boundingBox?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
            lines?: {
                text: string;
                confidence?: number | undefined;
                boundingBox?: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                } | undefined;
            }[] | undefined;
        }[] | undefined;
        metadata?: {
            processingTimeMs?: number | undefined;
            engine?: string | undefined;
            fileSize?: number | undefined;
            mimeType?: string | undefined;
        } | undefined;
    }, {
        extractedText: string;
        source: "on_device" | "server_fallback";
        confidence?: number | undefined;
        blocks?: {
            text: string;
            confidence?: number | undefined;
            boundingBox?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
            lines?: {
                text: string;
                confidence?: number | undefined;
                boundingBox?: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                } | undefined;
            }[] | undefined;
        }[] | undefined;
        metadata?: {
            processingTimeMs?: number | undefined;
            engine?: string | undefined;
            fileSize?: number | undefined;
            mimeType?: string | undefined;
        } | undefined;
    }>>;
    createdAt: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "failed" | "processing" | "completed";
    jobId: string;
    createdAt?: string | undefined;
    completedAt?: string | undefined;
    error?: string | undefined;
    result?: {
        extractedText: string;
        source: "on_device" | "server_fallback";
        confidence?: number | undefined;
        blocks?: {
            text: string;
            confidence?: number | undefined;
            boundingBox?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
            lines?: {
                text: string;
                confidence?: number | undefined;
                boundingBox?: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                } | undefined;
            }[] | undefined;
        }[] | undefined;
        metadata?: {
            processingTimeMs?: number | undefined;
            engine?: string | undefined;
            fileSize?: number | undefined;
            mimeType?: string | undefined;
        } | undefined;
    } | undefined;
}, {
    status: "pending" | "failed" | "processing" | "completed";
    jobId: string;
    createdAt?: string | undefined;
    completedAt?: string | undefined;
    error?: string | undefined;
    result?: {
        extractedText: string;
        source: "on_device" | "server_fallback";
        confidence?: number | undefined;
        blocks?: {
            text: string;
            confidence?: number | undefined;
            boundingBox?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
            lines?: {
                text: string;
                confidence?: number | undefined;
                boundingBox?: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                } | undefined;
            }[] | undefined;
        }[] | undefined;
        metadata?: {
            processingTimeMs?: number | undefined;
            engine?: string | undefined;
            fileSize?: number | undefined;
            mimeType?: string | undefined;
        } | undefined;
    } | undefined;
}>;
export type OcrJobStatus = z.infer<typeof ocrJobStatusSchema>;
export declare const ocrExtractBodySchema: z.ZodObject<{
    imageBase64: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
    async: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    async: boolean;
    mimeType?: string | undefined;
    imageBase64?: string | undefined;
}, {
    mimeType?: string | undefined;
    imageBase64?: string | undefined;
    async?: boolean | undefined;
}>;
export type OcrExtractBody = z.infer<typeof ocrExtractBodySchema>;
export declare const ALLOWED_IMAGE_MIME_TYPES: readonly ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/bmp", "image/tiff"];
export declare const MAX_IMAGE_SIZE_BYTES: number;
export declare function createReceiptFieldSchema<T extends z.ZodTypeAny>(valueSchema: T): z.ZodObject<{
    value: T;
    confidence: z.ZodNumber;
    isLowConfidence: z.ZodBoolean;
    rawText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    value: T;
    confidence: z.ZodNumber;
    isLowConfidence: z.ZodBoolean;
    rawText: z.ZodOptional<z.ZodString>;
}>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<{
    value: T;
    confidence: z.ZodNumber;
    isLowConfidence: z.ZodBoolean;
    rawText: z.ZodOptional<z.ZodString>;
}> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>;
export declare const receiptFieldStringSchema: z.ZodObject<{
    value: z.ZodString;
    confidence: z.ZodNumber;
    isLowConfidence: z.ZodBoolean;
    rawText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    value: string;
    confidence: number;
    isLowConfidence: boolean;
    rawText?: string | undefined;
}, {
    value: string;
    confidence: number;
    isLowConfidence: boolean;
    rawText?: string | undefined;
}>;
export declare const receiptFieldNumberSchema: z.ZodObject<{
    value: z.ZodNullable<z.ZodNumber>;
    confidence: z.ZodNumber;
    isLowConfidence: z.ZodBoolean;
    rawText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    value: number | null;
    confidence: number;
    isLowConfidence: boolean;
    rawText?: string | undefined;
}, {
    value: number | null;
    confidence: number;
    isLowConfidence: boolean;
    rawText?: string | undefined;
}>;
export declare const receiptFieldDateSchema: z.ZodObject<{
    value: z.ZodNullable<z.ZodString>;
    confidence: z.ZodNumber;
    isLowConfidence: z.ZodBoolean;
    rawText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    value: string | null;
    confidence: number;
    isLowConfidence: boolean;
    rawText?: string | undefined;
}, {
    value: string | null;
    confidence: number;
    isLowConfidence: boolean;
    rawText?: string | undefined;
}>;
export declare const receiptFieldCategorySchema: z.ZodObject<{
    value: z.ZodNullable<z.ZodString>;
    confidence: z.ZodNumber;
    isLowConfidence: z.ZodBoolean;
    rawText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    value: string | null;
    confidence: number;
    isLowConfidence: boolean;
    rawText?: string | undefined;
}, {
    value: string | null;
    confidence: number;
    isLowConfidence: boolean;
    rawText?: string | undefined;
}>;
export type ReceiptField<T> = {
    value: T;
    confidence: number;
    isLowConfidence: boolean;
    rawText?: string;
};
export declare const receiptLineItemSchema: z.ZodObject<{
    description: z.ZodString;
    amount: z.ZodOptional<z.ZodNumber>;
    confidence: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    description: string;
    amount?: number | undefined;
    confidence?: number | undefined;
}, {
    description: string;
    amount?: number | undefined;
    confidence?: number | undefined;
}>;
export type ReceiptLineItem = z.infer<typeof receiptLineItemSchema>;
export declare const parsedReceiptResultSchema: z.ZodObject<{
    merchant: z.ZodObject<{
        value: z.ZodString;
        confidence: z.ZodNumber;
        isLowConfidence: z.ZodBoolean;
        rawText: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        confidence: number;
        isLowConfidence: boolean;
        rawText?: string | undefined;
    }, {
        value: string;
        confidence: number;
        isLowConfidence: boolean;
        rawText?: string | undefined;
    }>;
    amount: z.ZodObject<{
        value: z.ZodNullable<z.ZodNumber>;
        confidence: z.ZodNumber;
        isLowConfidence: z.ZodBoolean;
        rawText: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        value: number | null;
        confidence: number;
        isLowConfidence: boolean;
        rawText?: string | undefined;
    }, {
        value: number | null;
        confidence: number;
        isLowConfidence: boolean;
        rawText?: string | undefined;
    }>;
    date: z.ZodObject<{
        value: z.ZodNullable<z.ZodString>;
        confidence: z.ZodNumber;
        isLowConfidence: z.ZodBoolean;
        rawText: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        value: string | null;
        confidence: number;
        isLowConfidence: boolean;
        rawText?: string | undefined;
    }, {
        value: string | null;
        confidence: number;
        isLowConfidence: boolean;
        rawText?: string | undefined;
    }>;
    category: z.ZodOptional<z.ZodObject<{
        value: z.ZodNullable<z.ZodString>;
        confidence: z.ZodNumber;
        isLowConfidence: z.ZodBoolean;
        rawText: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        value: string | null;
        confidence: number;
        isLowConfidence: boolean;
        rawText?: string | undefined;
    }, {
        value: string | null;
        confidence: number;
        isLowConfidence: boolean;
        rawText?: string | undefined;
    }>>;
    lineItems: z.ZodOptional<z.ZodArray<z.ZodObject<{
        description: z.ZodString;
        amount: z.ZodOptional<z.ZodNumber>;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        amount?: number | undefined;
        confidence?: number | undefined;
    }, {
        description: string;
        amount?: number | undefined;
        confidence?: number | undefined;
    }>, "many">>;
    overallConfidence: z.ZodNumber;
    source: z.ZodEnum<["on_device", "server_fallback"]>;
    rawText: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: {
        value: string | null;
        confidence: number;
        isLowConfidence: boolean;
        rawText?: string | undefined;
    };
    amount: {
        value: number | null;
        confidence: number;
        isLowConfidence: boolean;
        rawText?: string | undefined;
    };
    source: "on_device" | "server_fallback";
    rawText: string;
    merchant: {
        value: string;
        confidence: number;
        isLowConfidence: boolean;
        rawText?: string | undefined;
    };
    overallConfidence: number;
    category?: {
        value: string | null;
        confidence: number;
        isLowConfidence: boolean;
        rawText?: string | undefined;
    } | undefined;
    lineItems?: {
        description: string;
        amount?: number | undefined;
        confidence?: number | undefined;
    }[] | undefined;
}, {
    date: {
        value: string | null;
        confidence: number;
        isLowConfidence: boolean;
        rawText?: string | undefined;
    };
    amount: {
        value: number | null;
        confidence: number;
        isLowConfidence: boolean;
        rawText?: string | undefined;
    };
    source: "on_device" | "server_fallback";
    rawText: string;
    merchant: {
        value: string;
        confidence: number;
        isLowConfidence: boolean;
        rawText?: string | undefined;
    };
    overallConfidence: number;
    category?: {
        value: string | null;
        confidence: number;
        isLowConfidence: boolean;
        rawText?: string | undefined;
    } | undefined;
    lineItems?: {
        description: string;
        amount?: number | undefined;
        confidence?: number | undefined;
    }[] | undefined;
}>;
export type ParsedReceiptResult = z.infer<typeof parsedReceiptResultSchema>;
