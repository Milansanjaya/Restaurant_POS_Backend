import { Router } from "express";
import configController from "./config.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";
import { enforceBranch } from "../../middleware/branch.middleware";

const router = Router();

router.use(authenticate);
router.use(enforceBranch);

router.get("/", authorize("VIEW_SETTINGS"), configController.getConfig);
router.put("/", authorize("MANAGE_SETTINGS"), configController.updateConfig);
router.put("/tax", authorize("MANAGE_SETTINGS"), configController.updateTaxSettings);
router.post("/logo", authorize("MANAGE_SETTINGS"), configController.uploadLogo);

export default router;
