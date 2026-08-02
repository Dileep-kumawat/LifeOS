import type { NextFunction, Request, Response } from "express";
import { passport } from "./passport.js";
import type { UserDoc } from "../models/User.js";

// Use on any route that needs an authenticated user, e.g.:
//   v1.get("/me", requireAuth, (req, res) => res.json(req.user));
// Phase 1's login/register routes are what actually issue the JWTs this
// middleware verifies — this file just needs the strategy above to exist.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  passport.authenticate(
    "jwt",
    { session: false },
    (err: unknown, user: UserDoc | false) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      req.user = user;
      next();
    }
  )(req, res, next);
}
