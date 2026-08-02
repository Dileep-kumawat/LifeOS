import type { UserDoc } from "../models/User.js";

// Augments Express's built-in User type (used by Passport's req.user) so
// req.user is typed as our actual Mongoose User document everywhere,
// instead of `any`.
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-pattern
    interface User extends UserDoc {}
  }
}

export {};
