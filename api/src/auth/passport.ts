import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt, type StrategyOptions } from "passport-jwt";
import { env } from "../config/env.js";
import { logger } from "../logger.js";
import { User } from "../models/User.js";

export interface JwtPayload {
  userId: string;
  role: "user" | "admin";
  iat?: number;
  exp?: number;
}

const jwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: env.JWT_ACCESS_SECRET
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload: JwtPayload, done) => {
    try {
      const user = await User.findById(payload.userId);
      if (!user || user.status === "soft_deleted") {
        return done(null, false);
      }
      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  })
);

logger.info("Passport initialized (JWT strategy active)");

export { passport };
