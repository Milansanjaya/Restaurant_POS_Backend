import { Router } from "express";
import categoryController from "./category.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";
import { enforceBranch } from "../../middleware/branch.middleware";

const router = Router();

router.use(authenticate);
router.use(enforceBranch);

router.post("/", authorize("CREATE_CATEGORY"), categoryController.createCategory);
router.get("/", authorize("VIEW_CATEGORIES"), categoryController.getAllCategories);
router.get("/:id", authorize("VIEW_CATEGORIES"), categoryController.getCategoryById);
router.put("/:id", authorize("EDIT_CATEGORY"), categoryController.updateCategory);
router.delete("/:id", authorize("DELETE_CATEGORY"), categoryController.deleteCategory);

export default router;
