import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import Product from "../products/product.model";
import InventoryLog from "./inventoryLog.model";

export const adjustStock = async (req: AuthRequest, res: Response) => {
  try {
    const { productId, quantity } = req.body;

    const product = await Product.findOne({
      _id: productId,
      branch_id: req.user?.branch_id
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.stockQuantity += quantity;
    await product.save();

    await InventoryLog.create({
      product: product._id,
      branch_id: req.user?.branch_id,
      quantityChange: quantity,
      type: "ADJUSTMENT",
      performedBy: req.user?._id
    });

    res.json({
      message: "Stock adjusted successfully",
      newStock: product.stockQuantity
    });

  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};