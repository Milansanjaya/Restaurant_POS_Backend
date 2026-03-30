import { Router } from "express";
import {
  createGRN,
  approveGRN,
  getGRNs,
  getGRNById
} from "./grn.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("CREATE_GRN"),
  createGRN
);

router.get(
  "/",
  authenticate,
  authorize("VIEW_GRN"),
  getGRNs
);

router.get(
  "/:id",
  authenticate,
  authorize("VIEW_GRN"),
  getGRNById
);

router.put(
  "/:id/approve",
  authenticate,
  authorize("APPROVE_GRN"),
  approveGRN
);

export default router;
