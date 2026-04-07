import { Router } from "express";
import unitController from "./unit.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";

const router = Router();

router.use(authenticate);

router.post("/", authorize("MANAGE_UNITS"), unitController.createUnit);
router.get("/", authorize("VIEW_UNITS"), unitController.getAllUnits);
router.get("/:id", authorize("VIEW_UNITS"), unitController.getUnitById);
router.put("/:id", authorize("MANAGE_UNITS"), unitController.updateUnit);
router.delete("/:id", authorize("MANAGE_UNITS"), unitController.deleteUnit);

export default router;
