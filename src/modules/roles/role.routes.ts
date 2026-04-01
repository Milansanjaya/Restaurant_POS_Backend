import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getPermissions
} from "./role.controller";

const router = Router();

// All routes require authentication and MANAGE_ROLES permission
router.use(authenticate);

// Get all permissions (for role creation/editing)
router.get("/permissions", authorize("MANAGE_ROLES"), getPermissions);

// Get all roles
router.get("/", authorize("MANAGE_ROLES"), getRoles);

// Get single role
router.get("/:id", authorize("MANAGE_ROLES"), getRoleById);

// Create role
router.post("/", authorize("MANAGE_ROLES"), createRole);

// Update role
router.put("/:id", authorize("MANAGE_ROLES"), updateRole);

// Delete role
router.delete("/:id", authorize("MANAGE_ROLES"), deleteRole);

export default router;
