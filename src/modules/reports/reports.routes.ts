import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";
import { getDailyReport,getTopSellingProducts,getPaymentBreakdown } from "./reports.controller";

const router = Router();

router.get(
  "/daily",
  authenticate,
  authorize("VIEW_REPORTS"),
  getDailyReport
);

router.get(
  "/top-products",
  authenticate,
  authorize("VIEW_REPORTS"),
  getTopSellingProducts
);
router.get(
  "/payment-breakdown",
  authenticate,
  authorize("VIEW_REPORTS"),
  getPaymentBreakdown
);

export default router;