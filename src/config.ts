import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

// Validate JWT_SECRET - must be set in production
if (!process.env.JWT_SECRET && isProduction) {
  throw new Error("JWT_SECRET environment variable is required in production");
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.warn(
    "Warning: JWT_SECRET should be at least 32 characters for security"
  );
}

export const jwtSecret =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
export const mongoUri =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/test";
export const port = process.env.PORT || 3000;
