import jwt from "jsonwebtoken";
import { jwtSecret } from "./config";

export interface JwtPayload {
  userId: string;
  role: "teacher" | "student";
}

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: "1h" });
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, jwtSecret) as JwtPayload;
  } catch {
    throw new Error("Invalid or expired token");
  }
}
