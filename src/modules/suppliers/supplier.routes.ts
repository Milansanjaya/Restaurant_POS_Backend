import { Router } from "express";
import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  getSupplierLedger,
  recordSupplierPayment
} from "./supplier.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("CREATE_SUPPLIER"),
  createSupplier
);

router.get(
  "/",
  authenticate,
  authorize("VIEW_SUPPLIER"),
  getSuppliers
);

router.get(
  "/:id",
  authenticate,
  authorize("VIEW_SUPPLIER"),
  getSupplierById
);

router.put(
  "/:id",
  authenticate,
  authorize("EDIT_SUPPLIER"),
  updateSupplier
);

router.delete(
  "/:id",
  authenticate,
  authorize("DELETE_SUPPLIER"),
  deleteSupplier
);

router.get(
  "/:id/ledger",
  authenticate,
  authorize("VIEW_SUPPLIER"),
  getSupplierLedger
);

router.post(
  "/:id/payment",
  authenticate,
  authorize("RECORD_PAYMENT"),
  recordSupplierPayment
);

export default router;
