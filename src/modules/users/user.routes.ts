import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus
} from "./user.controller";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all users (requires VIEW_USERS permission)
router.get("/", authorize("VIEW_USERS"), getUsers);

// Get single user (requires VIEW_USERS permission)
router.get("/:id", authorize("VIEW_USERS"), getUserById);

// Create user (requires CREATE_USER permission)
router.post("/", authorize("CREATE_USER"), createUser);

// Update user (requires EDIT_USER permission)
router.put("/:id", authorize("EDIT_USER"), updateUser);

// Delete user (requires DELETE_USER permission)
router.delete("/:id", authorize("DELETE_USER"), deleteUser);

// Toggle user active status (requires EDIT_USER permission)
router.patch("/:id/toggle-status", authorize("EDIT_USER"), toggleUserStatus);

export default router;
