/**
 * Load environment variables from .env.local
 * Expo doesn't read .env files by default, so we do it manually
 */

import fs from "fs";
import path from "path";

export function loadEnv() {
  try {
    const envLocalPath = path.resolve(__dirname, "../../.env.local");

    // Check if .env.local exists
    if (!fs.existsSync(envLocalPath)) {
      console.log(
        "ℹ️  No .env.local file found (using defaults or system env vars)"
      );
      return;
    }

    // Read .env.local
    const envFile = fs.readFileSync(envLocalPath, "utf-8");
    const lines = envFile.split("\n");

    let loadedCount = 0;
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      // Parse KEY=VALUE
      const [key, ...rest] = trimmed.split("=");
      const value = rest.join("="); // Handle values with = in them

      if (key && value) {
        process.env[key] = value;
        loadedCount++;
      }
    }

    console.log(
      `✅ Loaded ${loadedCount} environment variables from .env.local`
    );
  } catch (error) {
    console.warn("⚠️  Failed to load .env.local:", error);
  }
}
