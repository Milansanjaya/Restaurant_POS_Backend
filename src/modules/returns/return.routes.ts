import { Router } from "express";
import returnController from "./return.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { enforceBranch } from "../../middleware/branch.middleware";

const router = Router();

router.use(authenticate);
router.use(enforceBranch);

router.post("/", returnController.createReturn);
router.get("/", returnController.getAllReturns);
router.get("/:id", returnController.getReturnById);
router.post("/:id/approve", returnController.approveReturn);

export default router;
