import { Request, Response } from "express";
import Product from "./product.model";
import { AuthRequest } from "../../middleware/auth.middleware";
import Inventory from "../inventory/inventory.model";



export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      sku,
      barcode,
      category,
      price,
      cost,
      taxRate,
      trackStock,
      preparationTime
    } = req.body;

    const existing = await Product.findOne({ sku });
    if (existing) {
      return res.status(400).json({ message: "SKU already exists" });
    }

    const product = await Product.create({
      name,
      sku,
      barcode,
      category,
      price,
      cost,
      taxRate,
      trackStock,
      preparationTime,
      branch_id: req.user?.branch_id,
      createdBy: req.user?._id
    });

    await Inventory.create({
  product: product._id,
  branch_id: req.user?.branch_id,
  stockQuantity: 0
});

    res.status(201).json({
      message: "Product created successfully",
      product
    });

  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};
export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    const query: any = {
      branch_id: req.user?.branch_id,
      isActive: true
    };

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const products = await Product.find(query)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    // 🔥 Add lowStock flag here
    const productsWithStockStatus = products.map((product: any) => {
      const lowStock =
        product.trackStock &&
        product.stockQuantity <= product.lowStockThreshold;

      return {
        ...product.toObject(),
        lowStock
      };
    });

    const total = await Product.countDocuments(query);

    res.json({
      total,
      page: Number(page),
      products: productsWithStockStatus   // ✅ IMPORTANT FIX
    });

  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const product = await Product.findOneAndUpdate(
      {
        _id: id,
        branch_id: req.user?.branch_id
      },
      req.body,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      message: "Product updated successfully",
      product
    });

  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const product = await Product.findOneAndUpdate(
      {
        _id: id,
        branch_id: req.user?.branch_id
      },
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deactivated successfully" });

  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};
export const getProductById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      _id: id,
      branch_id: req.user?.branch_id,
      isActive: true
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);

  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};