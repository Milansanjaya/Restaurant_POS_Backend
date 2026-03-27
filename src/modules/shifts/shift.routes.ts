import { Router } from "express";
import { openShift, closeShift } from "./shift.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.post("/open", authenticate, openShift);
router.post("/close", authenticate, closeShift);

export default router;