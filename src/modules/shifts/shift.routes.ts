import { Router } from "express";
import { openShift, closeShift } from "./shift.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";

const router = Router();

router.post("/open", authenticate, authorize("MANAGE_SHIFTS"), openShift);
router.post("/close", authenticate, authorize("MANAGE_SHIFTS"), closeShift);

export default router;