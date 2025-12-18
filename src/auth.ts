import express, { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import { User, Class, Attendance } from "./model";
import { signToken, verifyToken } from "./jwt";
import type { AuthRequest, AuthUser } from "./types";

const router = express.Router();

// Zod schemas for validation
const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["teacher", "student"]),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

const objectIdSchema = z.string().refine(
  (val) => mongoose.Types.ObjectId.isValid(val),
  { message: "Invalid ID format" }
);

// Middleware to verify JWT token
const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(401).json({
        success: false,
        error: "No token provided",
      });
      return;
    }

    const decoded = verifyToken(token);
    (req as AuthRequest).user = decoded as AuthUser;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
};

// Middleware to validate ObjectId params
const validateObjectId = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: `Invalid ${paramName} format`,
      });
      return;
    }
    next();
  };
};

// Get current user profile
router.get("/me", authenticate, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const user = await User.findById(authReq.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// Create a new class (teacher only)
router.post("/class", authenticate, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (authReq.user.role !== "teacher") {
      return res.status(403).json({
        success: false,
        error: "Only teachers can create classes",
      });
    }

    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Class name is required",
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        error: "Class name must be 100 characters or less",
      });
    }

    const newClass = new Class({
      name: name.trim(),
      teacherId: authReq.user.userId,
      students: [],
    });

    await newClass.save();

    return res.status(201).json({
      success: true,
      data: newClass,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// Add student to class (teacher only)
router.post(
  "/class/:id/add-student",
  authenticate,
  validateObjectId("id"),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (authReq.user.role !== "teacher") {
        return res.status(403).json({
          success: false,
          error: "Only teachers can add students",
        });
      }

      const { studentId } = req.body;

      // Validate studentId
      const studentIdValidation = objectIdSchema.safeParse(studentId);
      if (!studentIdValidation.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid student ID format",
        });
      }

      const classId = req.params.id;

      const classDoc = await Class.findById(classId);
      if (!classDoc) {
        return res.status(404).json({
          success: false,
          error: "Class not found",
        });
      }

      if (classDoc.teacherId.toString() !== authReq.user.userId) {
        return res.status(403).json({
          success: false,
          error: "You can only add students to your own classes",
        });
      }

      const student = await User.findById(studentId);
      if (!student || student.role !== "student") {
        return res.status(404).json({
          success: false,
          error: "Student not found",
        });
      }

      if (classDoc.students.some((s) => s.toString() === studentId)) {
        return res.status(400).json({
          success: false,
          error: "Student already in class",
        });
      }

      classDoc.students.push(new mongoose.Types.ObjectId(studentId));
      await classDoc.save();

      return res.status(200).json({
        success: true,
        data: classDoc,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  }
);

// Get class details (teacher who owns it OR enrolled student only)
router.get(
  "/class/:id",
  authenticate,
  validateObjectId("id"),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const classDoc = await Class.findById(req.params.id)
        .populate("teacherId", "name email")
        .populate("students", "name email");

      if (!classDoc) {
        return res.status(404).json({
          success: false,
          error: "Class not found",
        });
      }

      // Authorization check: user must be the teacher OR an enrolled student
      const isTeacher = classDoc.teacherId &&
        (classDoc.teacherId as unknown as { _id: mongoose.Types.ObjectId })._id.toString() === authReq.user.userId;
      const isEnrolledStudent = classDoc.students.some(
        (student) => (student as unknown as { _id: mongoose.Types.ObjectId })._id.toString() === authReq.user.userId
      );

      if (!isTeacher && !isEnrolledStudent) {
        return res.status(403).json({
          success: false,
          error: "You do not have access to this class",
        });
      }

      return res.status(200).json({
        success: true,
        data: classDoc,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  }
);

// Get all students (teacher only)
router.get("/students", authenticate, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (authReq.user.role !== "teacher") {
      return res.status(403).json({
        success: false,
        error: "Only teachers can view all students",
      });
    }

    const students = await User.find({ role: "student" }).select("-password");

    return res.status(200).json({
      success: true,
      data: students,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// Get student's attendance for a class (student must be enrolled)
router.get(
  "/class/:id/my-attendance",
  authenticate,
  validateObjectId("id"),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (authReq.user.role !== "student") {
        return res.status(403).json({
          success: false,
          error: "Only students can view their attendance",
        });
      }

      // Verify student is enrolled in this class
      const classDoc = await Class.findById(req.params.id);
      if (!classDoc) {
        return res.status(404).json({
          success: false,
          error: "Class not found",
        });
      }

      const isEnrolled = classDoc.students.some(
        (studentId) => studentId.toString() === authReq.user.userId
      );

      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          error: "You are not enrolled in this class",
        });
      }

      const attendance = await Attendance.find({
        classId: req.params.id,
        studentId: authReq.user.userId,
      });

      return res.status(200).json({
        success: true,
        data: attendance,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  }
);

// Start attendance session (teacher only)
router.post(
  "/attendance/start",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (authReq.user.role !== "teacher") {
        return res.status(403).json({
          success: false,
          error: "Only teachers can start attendance",
        });
      }

      const { classId } = req.body;

      // Validate classId
      const classIdValidation = objectIdSchema.safeParse(classId);
      if (!classIdValidation.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid class ID format",
        });
      }

      const classDoc = await Class.findById(classId);
      if (!classDoc) {
        return res.status(404).json({
          success: false,
          error: "Class not found",
        });
      }

      if (classDoc.teacherId.toString() !== authReq.user.userId) {
        return res.status(403).json({
          success: false,
          error: "You can only start attendance for your own classes",
        });
      }

      // Check for existing attendance records today to prevent duplicates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingAttendance = await Attendance.findOne({
        classId,
        createdAt: { $gte: today, $lt: tomorrow },
      });

      if (existingAttendance) {
        return res.status(400).json({
          success: false,
          error: "Attendance session already started for today",
        });
      }

      // Create attendance records for all students (default: absent)
      const attendanceRecords = classDoc.students.map((studentId) => ({
        classId,
        studentId,
        status: "absent" as const,
      }));

      const created = await Attendance.insertMany(attendanceRecords);

      return res.status(201).json({
        success: true,
        data: created,
        message: "Attendance session started",
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  }
);

// Signup
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const parsed = signupSchema.parse(req.body);
    const existingUser = await User.findOne({ email: parsed.email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "Email already in use",
      });
    }

    const hashedPassword = await bcrypt.hash(parsed.password, 10);
    const user = new User({
      name: parsed.name,
      email: parsed.email,
      password: hashedPassword,
      role: parsed.role,
    });
    await user.save();

    const token = signToken({ userId: user._id.toString(), role: user.role });

    return res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: err.issues[0].message,
      });
    }
    return res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : "Invalid input",
    });
  }
});

// Login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.parse(req.body);

    const user = await User.findOne({ email: parsed.email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(parsed.password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    const token = signToken({ userId: user._id.toString(), role: user.role });

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: err.issues[0].message,
      });
    }
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

export default router;
