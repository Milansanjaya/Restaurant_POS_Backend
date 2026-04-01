import { Router } from "express";
import { openShift, closeShift, getCurrentShift, getShifts, getShiftById } from "./shift.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";

const router = Router();

// Get current open shift
router.get("/current", authenticate, getCurrentShift);

// Get all shifts (history)
router.get("/", authenticate, authorize("VIEW_SHIFTS"), getShifts);

// Get shift by ID
router.get("/:id", authenticate, authorize("VIEW_SHIFTS"), getShiftById);

// Open a new shift
router.post("/open", authenticate, authorize("MANAGE_SHIFTS"), openShift);

// Close current shift
router.post("/close", authenticate, authorize("MANAGE_SHIFTS"), closeShift);

export default router;