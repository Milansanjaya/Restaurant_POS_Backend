import { Router } from "express";
import { createProduct,getProducts,updateProduct,deleteProduct,getProductById,toggleAvailability } from "./product.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("CREATE_PRODUCT"),
  createProduct
);

router.get(
  "/",
  authenticate,
  authorize("VIEW_PRODUCTS"),
  getProducts
);
router.get(
  "/:id",
  authenticate,
  authorize("VIEW_PRODUCTS"),
  getProductById
);
router.put(
  "/:id",
  authenticate,
  authorize("EDIT_PRODUCT"),
  updateProduct
);

router.patch(
  "/:id/availability",
  authenticate,
  authorize("EDIT_PRODUCT"),
  toggleAvailability
);

router.delete(
  "/:id",
  authenticate,
  authorize("DELETE_PRODUCT"),
  deleteProduct
);

export default router;