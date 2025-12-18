import jwt from "jsonwebtoken";
import { jwtSecret } from "./config";

export function signToken(payload: { userId: string; role: string }) {
  return jwt.sign(payload, jwtSecret, { expiresIn: "1h" });
}

export function decodeToken(token: string) {
  return jwt.decode(token);
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    throw new Error("Invalid or expired token");
  }
}
