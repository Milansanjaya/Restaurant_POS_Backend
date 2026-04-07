import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import Inventory from "./inventory.model";
import InventoryLog from "./inventoryLog.model";
import Product from "../products/product.model";

export const adjustInventory = async (req: AuthRequest, res: Response) => {
  try {
    const body = (req.body || {}) as any;

    // Accept client aliases (Postman uses product_id + adjustment)
    const productId = body.productId ?? body.product_id ?? body.product;
    const quantityChangeRaw =
      body.quantityChange ?? body.adjustment ?? body.quantity_change;
    const quantityChange = Number(quantityChangeRaw);

    // Default to ADJUSTMENT if client doesn't send it
    const type = (body.type ?? "ADJUSTMENT") as string;

    if (!productId || !Number.isFinite(quantityChange)) {
      return res.status(400).json({
        message: "productId (or product_id) and quantityChange (or adjustment) are required"
      });
    }

    const validTypes = ["PURCHASE", "ADJUSTMENT", "RETURN"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        message: "Invalid type"
      });
    }

    const product = await Product.findOne({
      _id: productId,
      branch_id: req.user?.branch_id,
      isActive: true
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    const inventory = await Inventory.findOne({
      product: productId,
      branch_id: req.user?.branch_id,
      isActive: true
    });

    if (!inventory) {
      return res.status(404).json({
        message: "Inventory not found"
      });
    }

    const newStock = inventory.stockQuantity + quantityChange;

    if (newStock < 0) {
      return res.status(400).json({
        message: "Stock cannot go below zero"
      });
    }

    inventory.stockQuantity = newStock;
    await inventory.save();

    await InventoryLog.create({
      product: productId,
      branch_id: req.user?.branch_id,
      quantityChange,
      type,
      performedBy: req.user?._id
    });

    res.json({
      message: "Inventory adjusted successfully",
      inventory
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

export const getBranchInventory = async (req: AuthRequest, res: Response) => {
  try {
    const inventory = await Inventory.find({
      branch_id: req.user?.branch_id,
      isActive: true
    }).populate({
      path: "product",
      match: { isActive: true }  // Only populate active products
    });

    // Filter out inventory items where product is null (deleted) or inactive
    const validInventory = inventory.filter(item => item.product != null);

    res.json({
      branch_id: req.user?.branch_id,
      inventory: validInventory
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};
export const fixInventory = async (req: AuthRequest, res: Response) => {
  try {
    const products = await Product.find({
      branch_id: req.user?.branch_id,
      isActive: true
    });

    let created = 0;

    for (const product of products) {
      const existing = await Inventory.findOne({
        product: product._id,
        branch_id: req.user?.branch_id
      });

      if (!existing) {
        await Inventory.create({
          product: product._id,
          branch_id: req.user?.branch_id,
          stockQuantity: 0
        });
        created++;
      }
    }

    res.json({
      message: "Inventory sync completed",
      created
    });

  } catch (error: any) {
    res.status(500).json({
      message: "Error",
      error: error.message
    });
  }
};

export const cleanupInventory = async (req: AuthRequest, res: Response) => {
  try {
    // Find all inventory items
    const allInventory = await Inventory.find({
      branch_id: req.user?.branch_id,
      isActive: true
    }).populate("product");

    let deactivated = 0;
    
    // Deactivate inventory items where product is null (deleted) or inactive
    for (const inv of allInventory) {
      if (!inv.product || (inv.product as any).isActive === false) {
        inv.isActive = false;
        await inv.save();
        deactivated++;
      }
    }

    res.json({
      message: "Inventory cleanup completed",
      deactivated
    });

  } catch (error: any) {
    res.status(500).json({
      message: "Error cleaning up inventory",
      error: error.message
    });
  }
};