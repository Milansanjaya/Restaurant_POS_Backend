import { Router } from "express";
import {
  createCoupon,
  getCoupons,
  updateCoupon,
  toggleCoupon
} from "./coupon.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.post("/", authenticate, createCoupon);
router.get("/", authenticate, getCoupons);
router.put("/:id", authenticate, updateCoupon);
router.patch("/:id/toggle", authenticate, toggleCoupon);

export default router;