import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";
import { getDailySales,getTopProducts,getPaymentSummary,getLowStock } from "./reports.controller";

const router = Router();

router.get(
  "/daily",
  authenticate,
  authorize("VIEW_REPORTS"),
  getDailySales
);

router.get(
  "/top-products",
  authenticate,
  authorize("VIEW_REPORTS"),
  getTopProducts
);
router.get(
  "/payments",
  authenticate,
  authorize("VIEW_REPORTS"),
  getPaymentSummary
);
router.get("/low-stock", authenticate, getLowStock);
export default router;