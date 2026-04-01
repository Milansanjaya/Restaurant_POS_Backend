import { Router } from "express";
import batchController from "./batch.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";
import { enforceBranch } from "../../middleware/branch.middleware";

const router = Router();

router.use(authenticate);
router.use(enforceBranch);

// Batch CRUD
router.post("/", authorize("MANAGE_BATCHES"), batchController.createBatch);
router.get("/", authorize("VIEW_BATCHES"), batchController.getAllBatches);
router.get("/:id", authorize("VIEW_BATCHES"), batchController.getBatchById);

// Expiry management
router.get("/alerts/near-expiry", authorize("VIEW_BATCHES"), batchController.getNearExpiryBatches);
router.get("/alerts/expired", authorize("VIEW_BATCHES"), batchController.getExpiredBatches);
router.get("/dashboard/expiry", authorize("VIEW_BATCHES"), batchController.getExpiryDashboard);

// Batch operations
router.post("/:id/toggle-block", authorize("MANAGE_BATCHES"), batchController.toggleBlockBatch);
router.put("/:id/quantity", authorize("MANAGE_BATCHES"), batchController.updateBatchQuantity);

export default router;
