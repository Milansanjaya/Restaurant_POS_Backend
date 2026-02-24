import { Router } from "express";
import { createSale,voidSale } from "./sale.controller";
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
export default router;