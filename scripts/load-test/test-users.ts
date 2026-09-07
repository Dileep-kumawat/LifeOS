import "./load-env.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/lifeos";
const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  "4d653abf859e157e390896ab0d11adc3063c1cd9745ce9fe3cf585317d1524dc";

export interface TestUser {
  userId: string;
  email: string;
  token: string;
}

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, default: "user" },
    status: { type: String, default: "active" },
    subscriptionTier: { type: String, default: "pro" }
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

/**
 * Ensures a dedicated pool of test users exists in the database.
 * Generates signed JWT access tokens for each user.
 */
export async function setupTestUsers(count: number = 50): Promise<TestUser[]> {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  const users: TestUser[] = [];
  const bulkOps = [];

  for (let i = 1; i <= count; i++) {
    const email = `loadtest_ws_${i.toString().padStart(4, "0")}@lifeos.internal`;
    bulkOps.push({
      updateOne: {
        filter: { email },
        update: {
          $setOnInsert: {
            email,
            name: `LoadTest WS User ${i}`,
            role: "user",
            status: "active",
            subscriptionTier: "pro",
            googleId: `loadtest_gid_${i}`
          }
        },
        upsert: true
      }
    });
  }

  if (bulkOps.length > 0) {
    await User.bulkWrite(bulkOps);
  }

  const dbUsers = await User.find({ email: { $regex: /^loadtest_ws_/ } })
    .select("_id email")
    .lean();

  for (const u of dbUsers) {
    const userId = (u._id as any).toString();
    const token = jwt.sign({ userId }, JWT_ACCESS_SECRET, { expiresIn: "24h" });
    users.push({
      userId,
      email: u.email,
      token
    });
  }

  return users;
}

/**
 * Cleans up ephemeral test users if requested.
 */
export async function cleanupTestUsers(): Promise<number> {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }
  const result = await User.deleteMany({ email: { $regex: /^loadtest_ws_/ } });
  return result.deletedCount;
}

/**
 * Closes MongoDB connection
 */
export async function closeTestDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
