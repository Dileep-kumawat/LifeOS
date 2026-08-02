import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt, type StrategyOptions } from "passport-jwt";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- re-enabled in Phase 10
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "../config/env.js";
import { logger } from "../logger.js";
import { User } from "../models/User.js";

// Per the SRS (§10.3): standardize on Passport.js for every auth strategy
// rather than mixing custom middleware with OAuth libs. This file is the
// single place all strategies get registered.
//
// JWT strategy is wired and active now — Phase 1 needs it the moment
// register/login endpoints exist to issue tokens. Google OAuth is
// deliberately left commented out: the build plan defers Google sign-in to
// Phase 10, but the dependency and registration point live here already so
// enabling it later is a config change, not new plumbing.

export interface JwtPayload {
  sub: string; // User._id
}

const jwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: env.JWT_ACCESS_SECRET
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload: JwtPayload, done) => {
    try {
      const user = await User.findById(payload.sub);
      if (!user) return done(null, false);
      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  })
);

// --- Google OAuth (Phase 10 — inactive until GOOGLE_CLIENT_ID/SECRET exist in env) ---
// if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
//   passport.use(
//     new GoogleStrategy(
//       {
//         clientID: env.GOOGLE_CLIENT_ID,
//         clientSecret: env.GOOGLE_CLIENT_SECRET,
//         callbackURL: "/api/v1/auth/google/callback"
//       },
//       async (_accessToken, _refreshToken, profile, done) => {
//         // find-or-create User from profile.emails[0].value
//         done(null, false);
//       }
//     )
//   );
// }

logger.info("Passport initialized (JWT strategy active, Google OAuth pending Phase 10)");

export { passport };
