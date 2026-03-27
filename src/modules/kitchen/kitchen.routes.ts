import { Router } from "express";
import {getKitchenQueue,updateKitchenStatus,getKitchenDashboard} from "./kitchen.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.get("/queue", authenticate, getKitchenQueue);
router.get("/dashboard", authenticate, getKitchenDashboard);
router.patch("/:id/status", authenticate, updateKitchenStatus);

export default router;