import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";
import {
  createTable,
  getTables,
  updateTableStatus,
  closeTable
} from "./table.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("VIEW_REPORTS"),
  getTables
);

router.post(
  "/",
  authenticate,
  authorize("EDIT_PRODUCT"),
  createTable
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("EDIT_PRODUCT"),
  updateTableStatus
);

router.post(
  "/:tableId/close",
  authenticate,
  closeTable
);

export default router;