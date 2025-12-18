import mongoose, { Model, Schema } from "mongoose";
import { IUser, IAttendance, IClass } from "./types";

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["teacher", "student"],
      required: true,
    },
  },
  { timestamps: true },
);

export const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

const attendanceSchema = new Schema<IAttendance>(
  {
    classId: { type: Schema.Types.ObjectId, required: true, ref: "Class" },
    studentId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    status: {
      type: String,
      enum: ["present", "absent"],
      required: true,
    },
  },
  { timestamps: true },
);

export const Attendance: Model<IAttendance> = mongoose.model<IAttendance>(
  "Attendance",
  attendanceSchema,
);

const classSchema = new Schema<IClass>(
  {
    name: { type: String, required: true },
    teacherId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    students: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

export const Class: Model<IClass> = mongoose.model<IClass>(
  "Class",
  classSchema,
);
