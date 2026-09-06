import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

export function correlationMiddleware(req: Request, res: Response, next: NextFunction) {
  const existingId =
    (req.headers["x-request-id"] as string) || (req.headers["x-correlation-id"] as string);
  const correlationId = existingId && existingId.trim() !== "" ? existingId.trim() : crypto.randomUUID();

  (req as any).id = correlationId;
  res.setHeader("X-Request-Id", correlationId);

  next();
}
