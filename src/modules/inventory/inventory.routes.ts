import { Router } from "express";
import { adjustStock } from "./inventory.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";

const router = Router();

router.post(
  "/adjust",
  authenticate,
  authorize("EDIT_PRODUCT"),
  adjustStock
);

export default router;