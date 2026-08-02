import { z } from "zod";

// Placeholder schema for Phase 0 — establishes the pattern of a single Zod
// schema shared between api (request validation + Swagger generation) and
// web (form validation). Real auth fields (password, tokens) are added in
// Phase 1 and should follow this same shared-schema approach.
export const userPublicSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  createdAt: z.string()
});

export type UserPublic = z.infer<typeof userPublicSchema>;
