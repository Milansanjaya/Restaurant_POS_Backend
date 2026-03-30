import { Router } from "express";
import configController from "./config.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { enforceBranch } from "../../middleware/branch.middleware";

const router = Router();

router.use(authenticate);
router.use(enforceBranch);

router.get("/", configController.getConfig);
router.put("/", configController.updateConfig);
router.put("/tax", configController.updateTaxSettings);
router.post("/logo", configController.uploadLogo);

export default router;
