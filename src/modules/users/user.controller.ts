import { Request, Response } from "express";
import User from "./user.model";
import Role from "../roles/role.model";
import bcrypt from "bcrypt";

// Get all users with populated role
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find()
      .populate({
        path: "role",
        select: "name description",
      })
      .select("-password")
      .sort({ createdAt: -1 });
    
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get single user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id)
      .populate({
        path: "role",
        populate: { path: "permissions" }
      })
      .select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Create new user
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, branch_id, isActive } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // Validate role
    const roleDoc = await Role.findById(role);
    if (!roleDoc) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      branch_id,
      isActive: isActive !== undefined ? isActive : true
    });

    const populatedUser = await User.findById(user._id)
      .populate("role")
      .select("-password");
    
    res.status(201).json({ 
      message: "User created successfully",
      user: populatedUser 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, branch_id, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
    }

    // Validate role if being changed
    if (role) {
      const roleDoc = await Role.findById(role);
      if (!roleDoc) {
        return res.status(400).json({ message: "Invalid role" });
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    if (role) user.role = role;
    if (branch_id) user.branch_id = branch_id;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();
    const populatedUser = await User.findById(user._id)
      .populate("role")
      .select("-password");
    
    res.json({ 
      message: "User updated successfully",
      user: populatedUser 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).populate("role");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent deleting super admin users
    const role = user.role as any;
    if (role.name === "SUPER_ADMIN") {
      return res.status(400).json({ 
        message: "Cannot delete SUPER_ADMIN users" 
      });
    }

    // Prevent users from deleting themselves
    const currentUser = (req as any).user;
    if (user._id.toString() === currentUser.userId) {
      return res.status(400).json({ 
        message: "Cannot delete your own account" 
      });
    }

    await user.deleteOne();
    res.json({ message: "User deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle user active status
export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isActive = !user.isActive;
    await user.save();

    const populatedUser = await User.findById(user._id)
      .populate("role")
      .select("-password");
    
    res.json({ 
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: populatedUser 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
