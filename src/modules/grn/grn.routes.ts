import { Router } from "express";
import {
  createGRN,
  approveGRN,
  getGRNs,
  getGRNById,
  updateGRN,
  deleteGRN,
  recordGRNPayment,
  getPaymentsForGRN,
  getAllGRNPayments
} from "./grn.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("CREATE_GRN"),
  createGRN
);

router.get(
  "/",
  authenticate,
  authorize("VIEW_GRN"),
  getGRNs
);

router.get(
  "/payments",
  authenticate,
  authorize("VIEW_GRN"),
  getAllGRNPayments
);

router.get(
  "/:id",
  authenticate,
  authorize("VIEW_GRN"),
  getGRNById
);

router.get(
  "/:id/payments",
  authenticate,
  authorize("VIEW_GRN"),
  getPaymentsForGRN
);

router.post(
  "/:id/payments",
  authenticate,
  authorize("RECORD_PAYMENT"),
  recordGRNPayment
);

router.put(
  "/:id",
  authenticate,
  authorize("CREATE_GRN"),
  updateGRN
);

router.delete(
  "/:id",
  authenticate,
  authorize("CREATE_GRN"),
  deleteGRN
);

router.put(
  "/:id/approve",
  authenticate,
  authorize("APPROVE_GRN"),
  approveGRN
);

export default router;
