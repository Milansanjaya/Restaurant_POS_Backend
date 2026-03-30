import { Router } from "express";
import loyaltyController from "./loyalty.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { enforceBranch } from "../../middleware/branch.middleware";

const router = Router();

router.use(authenticate);
router.use(enforceBranch);

// Loyalty account
router.get("/:customerId", loyaltyController.getLoyaltyAccount);

// Points management
router.post("/earn", loyaltyController.earnPoints);
router.post("/redeem", loyaltyController.redeemPoints);
router.get("/:customerId/points-history", loyaltyController.getPointsHistory);

// Wallet management
router.post("/wallet/topup", loyaltyController.walletTopup);
router.post("/wallet/payment", loyaltyController.walletPayment);
router.get("/:customerId/wallet-history", loyaltyController.getWalletHistory);

export default router;
