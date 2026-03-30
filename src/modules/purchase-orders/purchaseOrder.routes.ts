import { Router } from "express";
import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  approvePurchaseOrder,
  cancelPurchaseOrder
} from "./purchaseOrder.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("CREATE_PURCHASE_ORDER"),
  createPurchaseOrder
);

router.get(
  "/",
  authenticate,
  authorize("VIEW_PURCHASE_ORDER"),
  getPurchaseOrders
);

router.get(
  "/:id",
  authenticate,
  authorize("VIEW_PURCHASE_ORDER"),
  getPurchaseOrderById
);

router.put(
  "/:id/approve",
  authenticate,
  authorize("APPROVE_PURCHASE_ORDER"),
  approvePurchaseOrder
);

router.put(
  "/:id/cancel",
  authenticate,
  authorize("DELETE_PURCHASE_ORDER"),
  cancelPurchaseOrder
);

export default router;
