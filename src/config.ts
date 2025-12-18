import dotenv from "dotenv";

dotenv.config();

export const jwtSecret =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
export const mongoUri =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/test";
export const port = process.env.PORT || 3000;
