import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";
import { getDashboardSummary,getRevenueChart,getTopProductsChart,getShiftSummary } from "./dashboard.controller";


const router = Router();

router.get(
  "/summary",
  authenticate,
  authorize("VIEW_DASHBOARD"),
  getDashboardSummary
);

router.get(
  "/revenue-chart",
  authenticate,
  authorize("VIEW_DASHBOARD"),
  getRevenueChart
);
  
router.get(
  "/top-products",
  authenticate,
  authorize("VIEW_DASHBOARD"),
  getTopProductsChart
);
router.get(
  "/shift-summary",
  authenticate,
  authorize("VIEW_SHIFTS"),
  getShiftSummary
);

export default router;
