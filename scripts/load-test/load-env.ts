import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../../api/.env");

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

// Fallback hostnames for local host execution
if (!process.env.MONGO_URI || process.env.MONGO_URI.includes("mongo:27017")) {
  process.env.MONGO_URI = "mongodb://localhost:27017/lifeos";
}
if (!process.env.REDIS_URL || process.env.REDIS_URL.includes("redis:6379")) {
  process.env.REDIS_URL = "redis://localhost:6379";
}
