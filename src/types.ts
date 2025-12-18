import { Types } from "mongoose";

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
