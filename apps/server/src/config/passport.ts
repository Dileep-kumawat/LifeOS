import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env.js';
import { UserModel } from '../features/auth/models/User.model.js';
import { UserRole } from '@lifeos/shared';

export const configurePassport = (): void => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase() : '';
          const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : '';
          const name = profile.displayName || profile.name?.givenName || 'Google User';

          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          let user = await UserModel.findOne({
            $or: [{ googleId: profile.id }, { email }],
          });

          if (!user) {
            user = await UserModel.create({
              email,
              name,
              avatarUrl,
              googleId: profile.id,
              authProvider: 'google',
              role: UserRole.USER,
            });
          } else {
            if (!user.googleId) {
              user.googleId = profile.id;
            }
            if (avatarUrl && !user.avatarUrl) {
              user.avatarUrl = avatarUrl;
            }
            await user.save();
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      },
    ),
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await UserModel.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
