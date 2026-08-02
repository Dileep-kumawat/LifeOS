import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

// Generic validate() wraps a Zod schema as Express middleware, validating
// body/query/params in one place. Every route from Phase 1 onward should
// pair its Zod schema here with a matching entry registered against
// plugins/swagger.ts, so the two never drift apart.
type ValidateTarget = "body" | "query" | "params";

export function validate(schema: ZodTypeAny, target: ValidateTarget = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      return res.status(400).json({
        error: "ValidationError",
        details: result.error.flatten()
      });
    }

    req[target] = result.data;
    next();
  };
}
