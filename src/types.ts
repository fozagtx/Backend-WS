import { Types } from "mongoose";
import type { Request, Response, NextFunction } from "express";

export type UserRole = "teacher" | "student";

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export type AttendanceStatus = "present" | "absent";

export interface IAttendance {
  classId: Types.ObjectId;
  studentId: Types.ObjectId;
  status: AttendanceStatus;
}

export interface IClass {
  name: string;
  teacherId: Types.ObjectId;
  students: Types.ObjectId[];
}

// Authentication types
export interface AuthUser {
  userId: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user: AuthUser;
}

export type AuthRequestHandler = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => Promise<void | Response> | void | Response;
