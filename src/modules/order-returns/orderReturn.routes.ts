import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";
import { enforceBranch } from "../../middleware/branch.middleware";
import {
  searchSales,
  getSaleForReturn,
  createOrderReturn,
  getOrderReturns,
  getOrderReturnById,
} from "./orderReturn.controller";

const router = Router();

router.use(authenticate);
router.use(enforceBranch);

// Search sales to return against
router.get("/search-sales", authorize("VIEW_SALES"), searchSales);

// Load a single sale's items for the return form
router.get("/sale/:saleId", authorize("VIEW_SALES"), getSaleForReturn);

// Create a new customer order return
router.post("/", authorize("CREATE_RETURN"), createOrderReturn);

// List all order returns
router.get("/", authorize("VIEW_RETURNS"), getOrderReturns);

// Get single order return
router.get("/:id", authorize("VIEW_RETURNS"), getOrderReturnById);

export default router;
