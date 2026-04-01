import { Router } from "express";
import {
  createCoupon,
  getCoupons,
  updateCoupon,
  toggleCoupon
} from "./coupon.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";

const router = Router();

router.post("/", authenticate, authorize("CREATE_COUPON"), createCoupon);
router.get("/", authenticate, authorize("VIEW_COUPONS"), getCoupons);
router.put("/:id", authenticate, authorize("EDIT_COUPON"), updateCoupon);
router.patch("/:id/toggle", authenticate, authorize("EDIT_COUPON"), toggleCoupon);

export default router;