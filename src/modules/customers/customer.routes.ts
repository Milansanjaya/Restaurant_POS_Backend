import { Router } from "express";
import customerController from "./customer.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { enforceBranch } from "../../middleware/branch.middleware";

const router = Router();

router.use(authenticate);
router.use(enforceBranch);

// Customer CRUD
router.post("/", customerController.createCustomer);
router.get("/", customerController.getAllCustomers);
router.get("/walk-in", customerController.getWalkInCustomer);
router.get("/:id", customerController.getCustomerById);
router.get("/phone/:phone", customerController.getCustomerByPhone);
router.put("/:id", customerController.updateCustomer);
router.delete("/:id", customerController.deleteCustomer);

// Customer history & stats
router.get("/:id/history", customerController.getCustomerHistory);
router.post("/:id/update-stats", customerController.updateCustomerStats);

export default router;
