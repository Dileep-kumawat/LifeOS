import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt, type StrategyOptions } from "passport-jwt";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
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

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        scope: ["profile", "email"]
      },
      (_accessToken, _refreshToken, profile, done) => {
        return done(null, profile as any);
      }
    )
  );
  logger.info("Passport initialized (JWT and Google OAuth strategies active)");
} else {
  logger.info("Passport initialized (JWT strategy active)");
}

export { passport };
