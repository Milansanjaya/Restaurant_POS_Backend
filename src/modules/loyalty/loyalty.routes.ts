import { Router } from "express";
import loyaltyController from "./loyalty.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";
import { enforceBranch } from "../../middleware/branch.middleware";

const router = Router();

router.use(authenticate);
router.use(enforceBranch);

// Loyalty account
router.get("/:customerId", authorize("VIEW_LOYALTY"), loyaltyController.getLoyaltyAccount);

// Points management
router.post("/earn", authorize("MANAGE_LOYALTY"), loyaltyController.earnPoints);
router.post("/redeem", authorize("MANAGE_LOYALTY"), loyaltyController.redeemPoints);
router.get("/:customerId/points-history", authorize("VIEW_LOYALTY"), loyaltyController.getPointsHistory);

// Wallet management
router.post("/wallet/topup", authorize("MANAGE_LOYALTY"), loyaltyController.walletTopup);
router.post("/wallet/payment", authorize("MANAGE_LOYALTY"), loyaltyController.walletPayment);
router.get("/:customerId/wallet-history", authorize("VIEW_LOYALTY"), loyaltyController.getWalletHistory);

export default router;
