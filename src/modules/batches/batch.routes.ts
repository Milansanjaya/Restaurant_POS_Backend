import { Router } from "express";
import batchController from "./batch.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { enforceBranch } from "../../middleware/branch.middleware";

const router = Router();

router.use(authenticate);
router.use(enforceBranch);

// Batch CRUD
router.post("/", batchController.createBatch);
router.get("/", batchController.getAllBatches);
router.get("/:id", batchController.getBatchById);

// Expiry management
router.get("/alerts/near-expiry", batchController.getNearExpiryBatches);
router.get("/alerts/expired", batchController.getExpiredBatches);
router.get("/dashboard/expiry", batchController.getExpiryDashboard);

// Batch operations
router.post("/:id/toggle-block", batchController.toggleBlockBatch);
router.put("/:id/quantity", batchController.updateBatchQuantity);

export default router;
