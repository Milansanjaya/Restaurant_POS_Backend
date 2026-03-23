import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import Product from "../products/product.model";
import Sale from "./sale.model";
import InventoryLog from "../inventory/inventoryLog.model";
import KitchenOrder from "../kitchen/kitchen.model";
import Shift from "../shifts/shift.model"; // ✅ IMPORTANT

// ================= CREATE SALE =================
export const createSale = async (req: AuthRequest, res: Response) => {
  try {
    // 🔒 Check open shift
    const openShift = await Shift.findOne({
      cashier: req.user?._id,
      status: "OPEN"
    });

    if (!openShift) {
      return res.status(400).json({
        message: "No open shift. Please open shift first."
      });
    }

    const { items, paymentMethod, discount = 0 } = req.body;

    let subtotal = 0;
    let taxTotal = 0;
    const processedItems: any[] = [];

    // 🔹 Phase 1: Validate + calculate
    for (const item of items) {
      const product = await Product.findOne({
        _id: item.product,
        branch_id: req.user?.branch_id,
        isActive: true
      });

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (product.trackStock && product.stockQuantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}`
        });
      }

      const itemSubtotal = product.price * item.quantity;
      const itemTax = (itemSubtotal * product.taxRate) / 100;

      subtotal += itemSubtotal;
      taxTotal += itemTax;

      processedItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        taxRate: product.taxRate,
        subtotal: itemSubtotal,
        productName: product.name // ✅ IMPORTANT for kitchen
      });
    }

    const grandTotal = subtotal + taxTotal - discount;
    const invoiceNumber = `INV-${Date.now()}`;

    // 🔹 Phase 2: Create Sale
    const sale = await Sale.create({
      invoiceNumber,
      branch_id: req.user?.branch_id,
      items: processedItems,
      subtotal,
      taxTotal,
      discount,
      grandTotal,
      paymentMethod,
      createdBy: req.user?._id
    });

    // 🔹 Phase 3: Deduct stock + log
    for (const item of sale.items) {
      const product = await Product.findById(item.product);

      if (product && product.trackStock) {
        product.stockQuantity -= item.quantity;
        await product.save();

        await InventoryLog.create({
          product: product._id,
          branch_id: req.user?.branch_id,
          quantityChange: -item.quantity,
          type: "SALE",
          referenceId: sale._id,
          performedBy: req.user?._id
        });
      }
    }

    // 🔥 Phase 4: Create Kitchen Order
    await KitchenOrder.create({
      sale: sale._id,
      branch_id: req.user?.branch_id,
      items: processedItems.map((item) => ({
        product: item.product,
        name: item.productName,
        quantity: item.quantity
      })),
      createdBy: req.user?._id
    });

    res.status(201).json({
      message: "Sale completed successfully",
      sale
    });

  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

// ================= VOID SALE =================
export const voidSale = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const sale = await Sale.findOne({
      _id: id,
      branch_id: req.user?.branch_id
    });

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    if (sale.status === "VOIDED") {
      return res.status(400).json({ message: "Sale already voided" });
    }

    // 🔹 Restore stock
    for (const item of sale.items) {
      const product = await Product.findById(item.product);

      if (product && product.trackStock) {
        product.stockQuantity += item.quantity;
        await product.save();

        await InventoryLog.create({
          product: product._id,
          branch_id: req.user?.branch_id,
          quantityChange: item.quantity,
          type: "RETURN",
          referenceId: sale._id,
          performedBy: req.user?._id
        });
      }
    }

    sale.status = "VOIDED";
    (sale as any).voidedBy = req.user?._id;
    (sale as any).voidedAt = new Date();
    (sale as any).voidReason = reason;

    await sale.save();

    res.json({ message: "Sale voided successfully" });

  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};