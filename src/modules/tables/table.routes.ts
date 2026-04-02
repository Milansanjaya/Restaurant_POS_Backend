import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";
import {
  createTable,
  getTables,
  updateTable,
  deleteTable,
  updateTableStatus,
  closeTable
} from "./table.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("VIEW_TABLES"),
  getTables
);

router.post(
  "/",
  authenticate,
  authorize("MANAGE_TABLES"),
  createTable
);

router.put(
  "/:id",
  authenticate,
  authorize("MANAGE_TABLES"),
  updateTable
);

router.delete(
  "/:id",
  authenticate,
  authorize("MANAGE_TABLES"),
  deleteTable
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("MANAGE_TABLES"),
  updateTableStatus
);

router.post(
  "/:tableId/close",
  authenticate,
  authorize("MANAGE_TABLES"),
  closeTable
);

export default router;