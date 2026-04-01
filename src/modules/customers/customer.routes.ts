import { Router } from "express";
import customerController from "./customer.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";
import { enforceBranch } from "../../middleware/branch.middleware";

const router = Router();

router.use(authenticate);
router.use(enforceBranch);

// Customer CRUD
router.post("/", authorize("CREATE_CUSTOMER"), customerController.createCustomer);
router.get("/", authorize("VIEW_CUSTOMERS"), customerController.getAllCustomers);
router.get("/walk-in", authorize("VIEW_CUSTOMERS"), customerController.getWalkInCustomer);
router.get("/:id", authorize("VIEW_CUSTOMERS"), customerController.getCustomerById);
router.get("/phone/:phone", authorize("VIEW_CUSTOMERS"), customerController.getCustomerByPhone);
router.put("/:id", authorize("EDIT_CUSTOMER"), customerController.updateCustomer);
router.delete("/:id", authorize("DELETE_CUSTOMER"), customerController.deleteCustomer);

// Customer history & stats
router.get("/:id/history", authorize("VIEW_CUSTOMERS"), customerController.getCustomerHistory);
router.post("/:id/update-stats", authorize("EDIT_CUSTOMER"), customerController.updateCustomerStats);

export default router;
