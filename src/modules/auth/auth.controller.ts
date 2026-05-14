import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../users/user.model";
import Role from "../roles/role.model";
import { AuthRequest } from "../../middleware/auth.middleware";

export const registerAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password, branch_id } = req.body;

    if (!name || !email || !password || !branch_id) {
      return res.status(400).json({
        message: "name, email, password and branch_id are required"
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const adminRole = await Role.findOne({ name: "SUPER_ADMIN" });
    if (!adminRole) {
      return res.status(400).json({ message: "Admin role not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: adminRole._id,
      branch_id
    });

    const safeUser: any = user.toObject();
    delete safeUser.password;

    res.status(201).json({
      message: "Admin registered successfully",
      user: safeUser
    });
  } catch (error: any) {
    console.error("REGISTER ADMIN ERROR:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error?.message
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET not configured" });
    }

    const user = await User.findOne({ email }).populate({
      path: "role",
      populate: {
        path: "permissions",
        model: "Permission"
      }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "User is inactive" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const role = user.role as any;

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        roleId: role?._id?.toString(),
        branch_id: user.branch_id
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const permissions = role?.permissions?.map((p: any) => p.name) || [];

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        branch_id: user.branch_id,
        role: {
          _id: role?._id,
          name: role?.name
        },
        permissions
      }
    });
  } catch (error: any) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get current user info
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const role = user.role as any;
    const permissions = role?.permissions?.map((p: any) => p.name) || [];

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        branch_id: user.branch_id,
        role: {
          _id: role?._id,
          name: role?.name
        },
        permissions
      }
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

// Demo Login - Creates temporary isolated user session
export const demoLogin = async (req: Request, res: Response) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET not configured" });
    }

    // Generate unique session ID
    const sessionId = `demo_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate temporary demo email
    const tempEmail = `${sessionId}@demo.local`;

    // Use full-access role for demo users
    const demoRole = await Role.findOne({ name: "SUPER_ADMIN" }).populate({
      path: "permissions",
      model: "Permission"
    });
    if (!demoRole) {
      return res.status(400).json({ message: "Demo role (SUPER_ADMIN) not found" });
    }

    // Generate a temporary password
    const tempPassword = await bcrypt.hash(sessionId, 10);

    // Set expiration: 30 minutes from now
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Create temporary user
    const tempUser = await User.create({
      name: `Demo User (${sessionId.substring(0, 8)})`,
      email: tempEmail,
      password: tempPassword,
      role: demoRole._id,
      branch_id: "demo",
      isActive: true,
      is_temporary: true,
      session_id: sessionId,
      demo_expires_at: expiresAt
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: tempUser._id.toString(),
        roleId: demoRole._id.toString(),
        branch_id: "demo",
        is_temporary: true,
        session_id: sessionId
      },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    const permissions = (demoRole as any)?.permissions?.map((p: any) => p.name) || [];

    res.json({
      token,
      user: {
        _id: tempUser._id,
        name: tempUser.name,
        email: tempUser.email,
        branch_id: tempUser.branch_id,
        role: {
          _id: demoRole._id,
          name: "SUPER_ADMIN"
        },
        permissions,
        is_temporary: true,
        session_id: sessionId,
        expires_at: expiresAt
      }
    });
  } catch (error: any) {
    console.error("DEMO LOGIN ERROR:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};