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
  "/:id([0-9a-fA-F]{24})",
  authenticate,
  authorize("VIEW_GRN"),
  getGRNById
);

router.get(
  "/:id([0-9a-fA-F]{24})/payments",
  authenticate,
  authorize("VIEW_GRN"),
  getPaymentsForGRN
);

router.post(
  "/:id([0-9a-fA-F]{24})/payments",
  authenticate,
  authorize("RECORD_PAYMENT"),
  recordGRNPayment
);

router.put(
  "/:id([0-9a-fA-F]{24})",
  authenticate,
  authorize("CREATE_GRN"),
  updateGRN
);

router.delete(
  "/:id([0-9a-fA-F]{24})",
  authenticate,
  authorize("CREATE_GRN"),
  deleteGRN
);

router.put(
  "/:id([0-9a-fA-F]{24})/approve",
  authenticate,
  authorize("APPROVE_GRN"),
  approveGRN
);

export default router;
