import jwt from "jsonwebtoken";
import { jwtSecret } from "./config";

const token = jwt.sign({ data: "student" }, jwtSecret, { expiresIn: "1hr" });

export function decode() {
  try {
    const decoded = jwt.decode(token);
    console.log(token);
  } catch (err) {
    err: "error decoding";
  }
}
export function verify() {
  try {
    const verified = jwt.verify(token, jwtSecret);
    console.log(verified);
  } catch (err) {
    err: "cannot verify";
  }
}
