import { Router } from "express";
import unitController from "./unit.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.post("/", unitController.createUnit);
router.get("/", unitController.getAllUnits);
router.get("/:id", unitController.getUnitById);
router.put("/:id", unitController.updateUnit);
router.delete("/:id", unitController.deleteUnit);

export default router;
