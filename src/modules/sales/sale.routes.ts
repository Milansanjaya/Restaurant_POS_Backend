import { Router } from "express";
import { createSale, voidSale, closeTableSale, paySale,getInvoice,refundSale } from "./sale.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("CREATE_SALE"),
  createSale
);
router.post(
  "/void/:id",
  authenticate,
  authorize("VOID_SALE"),
  voidSale
);
router.post(
  "/:tableId/close",
  authenticate,
  closeTableSale
);
router.post(
  "/:saleId/pay",
  authenticate,
  authorize("CREATE_SALE"),
  paySale
);

router.get(
  "/:saleId/invoice",
  authenticate,
  authorize("VIEW_REPORTS"),
  getInvoice
);

router.post(
  "/:saleId/refund",
  authenticate,
  authorize("VOID_SALE"),
  refundSale
);
export default router;