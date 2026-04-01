import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../users/user.model";
import Role from "../roles/role.model";
import { AuthRequest } from "../../middleware/auth.middleware";

export const registerAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password, branch_id } = req.body;

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

    res.status(201).json({
      message: "Admin registered successfully",
      user
    });
  } catch (error) {
    res.status(500).json({ error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    // Return user info with permissions
    const role = user.role as any;
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