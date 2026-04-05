import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";
import {adjustInventory,getBranchInventory,fixInventory,cleanupInventory} from "./inventory.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("VIEW_INVENTORY"),
  getBranchInventory
);

router.post(
  "/adjust",
  authenticate,
  authorize("ADJUST_INVENTORY"),
  adjustInventory
);

router.post("/fix", authenticate, authorize("ADJUST_INVENTORY"), fixInventory);

router.post("/cleanup", authenticate, authorize("ADJUST_INVENTORY"), cleanupInventory);

export default router;