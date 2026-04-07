import { Router } from "express";
import returnController from "./return.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";
import { enforceBranch } from "../../middleware/branch.middleware";

const router = Router();

router.use(authenticate);
router.use(enforceBranch);

router.post("/", authorize("CREATE_RETURN"), returnController.createReturn);
router.get("/", authorize("VIEW_RETURNS"), returnController.getAllReturns);
router.get("/:id", authorize("VIEW_RETURNS"), returnController.getReturnById);
router.post("/:id/approve", authorize("CREATE_RETURN"), returnController.approveReturn);

export default router;
