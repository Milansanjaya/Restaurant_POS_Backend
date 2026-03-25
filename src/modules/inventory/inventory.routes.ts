import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";
import {adjustInventory,getBranchInventory,fixInventory} from "./inventory.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("VIEW_REPORTS"),
  getBranchInventory
);

router.post(
  "/adjust",
  authenticate,
  authorize("EDIT_PRODUCT"),
  adjustInventory
);

router.post("/fix", authenticate, fixInventory);

export default router;