import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";
import { getDashboardSummary,getRevenueChart,getTopProductsChart,getShiftSummary } from "./dashboard.controller";


const router = Router();

router.get(
  "/summary",
  authenticate,
  authorize("VIEW_REPORTS"),
  getDashboardSummary
);

router.get(
  "/revenue-chart",
  authenticate,
  authorize("VIEW_REPORTS"),
  getRevenueChart
);
  
router.get(
  "/top-products",
  authenticate,
  authorize("VIEW_REPORTS"),
  getTopProductsChart
);
router.get(
  "/shift-summary",
  authenticate,
  authorize("VIEW_REPORTS"),
  getShiftSummary
);

export default router;
