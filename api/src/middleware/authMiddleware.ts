import type { NextFunction, Request, Response } from "express";
import passport from "passport";
import type { UserDoc } from "../models/User.js";

declare global {
  namespace Express {
    interface User extends UserDoc {}
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  passport.authenticate(
    "jwt",
    { session: false },
    (err: unknown, user: UserDoc | false | null, _info: unknown) => {
      if (err) {
        return next(err);
      }
      if (!user || user.status !== "active") {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Authentication required or account is inactive."
        });
      }
      req.user = user;
      next();
    }
  )(req, res, next);
}

export function requireRole(role: "user" | "admin") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required."
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Insufficient permissions for this action."
      });
    }

    next();
  };
}
