import { Request, Response } from "express";
import Role from "./role.model";
import Permission from "./permission.model";

// Get all roles with populated permissions
export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await Role.find().populate("permissions").sort({ name: 1 });
    res.json({ roles });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get single role by ID
export const getRoleById = async (req: Request, res: Response) => {
  try {
    const role = await Role.findById(req.params.id).populate("permissions");
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }
    res.json({ role });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Create new role
export const createRole = async (req: Request, res: Response) => {
  try {
    const { name, description, permissions } = req.body;

    // Check if role already exists
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({ message: "Role with this name already exists" });
    }

    // Validate permissions
    if (permissions && permissions.length > 0) {
      const validPermissions = await Permission.find({ _id: { $in: permissions } });
      if (validPermissions.length !== permissions.length) {
        return res.status(400).json({ message: "Some permissions are invalid" });
      }
    }

    const role = await Role.create({ name, description, permissions });
    const populatedRole = await Role.findById(role._id).populate("permissions");
    
    res.status(201).json({ 
      message: "Role created successfully",
      role: populatedRole 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Update role
export const updateRole = async (req: Request, res: Response) => {
  try {
    const { name, description, permissions } = req.body;

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Check if name is being changed and if it already exists
    if (name && name !== role.name) {
      const existingRole = await Role.findOne({ name });
      if (existingRole) {
        return res.status(400).json({ message: "Role with this name already exists" });
      }
    }

    // Validate permissions
    if (permissions && permissions.length > 0) {
      const validPermissions = await Permission.find({ _id: { $in: permissions } });
      if (validPermissions.length !== permissions.length) {
        return res.status(400).json({ message: "Some permissions are invalid" });
      }
    }

    if (name) role.name = name;
    if (description !== undefined) role.description = description;
    if (permissions) role.permissions = permissions;

    await role.save();
    const populatedRole = await Role.findById(role._id).populate("permissions");
    
    res.json({ 
      message: "Role updated successfully",
      role: populatedRole 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Delete role
export const deleteRole = async (req: Request, res: Response) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Prevent deleting SUPER_ADMIN or ADMIN roles
    if (role.name === "SUPER_ADMIN" || role.name === "ADMIN") {
      return res.status(400).json({ 
        message: "Cannot delete SUPER_ADMIN or ADMIN roles" 
      });
    }

    // Check if any users have this role
    const User = require("../users/user.model").default;
    const usersWithRole = await User.countDocuments({ role: role._id });
    if (usersWithRole > 0) {
      return res.status(400).json({ 
        message: `Cannot delete role. ${usersWithRole} user(s) are assigned this role.` 
      });
    }

    await role.deleteOne();
    res.json({ message: "Role deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get all permissions
export const getPermissions = async (req: Request, res: Response) => {
  try {
    const permissions = await Permission.find().sort({ name: 1 });
    res.json({ permissions });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
