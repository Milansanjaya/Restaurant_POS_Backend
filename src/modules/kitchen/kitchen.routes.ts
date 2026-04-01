import { Router } from "express";
import {getKitchenQueue,updateKitchenStatus,getKitchenDashboard} from "./kitchen.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";

const router = Router();

router.get("/queue", authenticate, authorize("VIEW_KITCHEN"), getKitchenQueue);
router.get("/dashboard", authenticate, authorize("VIEW_KITCHEN"), getKitchenDashboard);
router.patch("/:id/status", authenticate, authorize("UPDATE_KITCHEN_STATUS"), updateKitchenStatus);

export default router;