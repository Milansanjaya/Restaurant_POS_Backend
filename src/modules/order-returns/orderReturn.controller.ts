import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import OrderReturn from "./orderReturn.model";
import Sale from "../sales/sale.model";
import Inventory from "../inventory/inventory.model";
import InventoryLog from "../inventory/inventoryLog.model";

// ===== SEARCH SALES BY INVOICE / ORDER ID =====
export const searchSales = async (req: AuthRequest, res: Response) => {
  try {
    const branchId = req.user?.branch_id;
    const search = String(req.query.search || "").trim();

    if (!branchId) return res.status(401).json({ message: "Unauthorized" });
    if (!search) return res.status(400).json({ message: "Search query required" });

    // Match by invoiceNumber or _id (if valid ObjectId)
    const query: any = {
      branch_id: branchId,
      status: "COMPLETED",
      $or: [
        { invoiceNumber: { $regex: search, $options: "i" } },
      ],
    };

    const mongoose = await import("mongoose");
    if (mongoose.default.Types.ObjectId.isValid(search)) {
      query.$or.push({ _id: search });
    }

    const sales = await Sale.find(query)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("items.product", "name price")
      .populate("customer_id", "name phone");

    res.json({ sales });
  } catch (error: any) {
    res.status(500).json({ message: "Error searching sales", error: error.message });
  }
};

// ===== GET SALE BY ID (for loading items) =====
export const getSaleForReturn = async (req: AuthRequest, res: Response) => {
  try {
    const branchId = req.user?.branch_id;
    const { saleId } = req.params;

    if (!branchId) return res.status(401).json({ message: "Unauthorized" });

    const sale = await Sale.findOne({ _id: saleId, branch_id: branchId })
      .populate("items.product", "name price trackStock")
      .populate("customer_id", "name phone");

    if (!sale) return res.status(404).json({ message: "Sale not found" });

    res.json({ sale });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching sale", error: error.message });
  }
};

// ===== CREATE ORDER RETURN =====
export const createOrderReturn = async (req: AuthRequest, res: Response) => {
  try {
    const branchId = req.user?.branch_id;
    const userId = req.user?._id;

    if (!branchId || !userId) return res.status(401).json({ message: "Unauthorized" });

    const { sale_id, returnType, items, notes, imageUrl } = req.body;

    if (!sale_id) return res.status(400).json({ message: "sale_id is required" });
    if (!["INTERNAL", "CUSTOMER"].includes(returnType)) {
      return res.status(400).json({ message: "returnType must be INTERNAL or CUSTOMER" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items are required" });
    }

    // Load the original sale
    const sale = await Sale.findOne({ _id: sale_id, branch_id: branchId })
      .populate("items.product", "name price trackStock");

    if (!sale) return res.status(404).json({ message: "Sale not found" });
    if (sale.status === "VOIDED") return res.status(400).json({ message: "Cannot return a voided sale" });

    // Validate each return item against the original sale
    const processedItems: any[] = [];
    let totalRefund = 0;

    for (const ri of items) {
      const saleItem = sale.items.find(
        (si: any) => si.product._id?.toString() === ri.product || si.product?.toString() === ri.product
      );

      if (!saleItem) {
        return res.status(400).json({ message: `Product ${ri.product} not found in original order` });
      }

      if (ri.quantity > saleItem.quantity) {
        return res.status(400).json({
          message: `Cannot return more than purchased qty for ${ri.productName}. Max: ${saleItem.quantity}`
        });
      }

      if (ri.quantity <= 0) {
        return res.status(400).json({ message: `Return quantity must be > 0` });
      }

      const itemRefund = saleItem.price * ri.quantity;
      totalRefund += itemRefund;

      processedItems.push({
        product: saleItem.product,
        productName: ri.productName || (saleItem.product as any)?.name || "Item",
        quantity: ri.quantity,
        price: saleItem.price,
        refundAmount: itemRefund,
        reason: ri.reason || "Returned",
      });
    }

    // Generate return number
    const lastReturn = await OrderReturn.findOne({ branch_id: branchId }).sort({ createdAt: -1 });
    let seqNum = 1;
    if (lastReturn?.returnNumber) {
      const parts = lastReturn.returnNumber.split("-");
      seqNum = (parseInt(parts[parts.length - 1] || "0") || 0) + 1;
    }
    const returnNumber = `ORD-RET-${String(seqNum).padStart(6, "0")}`;

    // Create the return record (ORIGINAL SALE IS NEVER MODIFIED)
    const orderReturn = new OrderReturn({
      returnNumber,
      sale_id,
      invoiceNumber: sale.invoiceNumber,
      branch_id: branchId,
      returnType,
      items: processedItems,
      refundAmount: totalRefund,
      status: "COMPLETED",
      notes: notes || undefined,
      imageUrl: imageUrl || undefined,
      processedBy: userId,
    });

    await orderReturn.save();

    // Stock handling:
    // CUSTOMER return → add back to inventory (resalable)
    // INTERNAL return → do NOT add to stock (wastage/loss)
    if (returnType === "CUSTOMER") {
      for (const item of processedItems) {
        const product = await import("../products/product.model").then(m => m.default.findById(item.product));
        if (product?.trackStock) {
          const inventory = await Inventory.findOne({
            product: item.product,
            branch_id: branchId,
            isActive: true,
          });
          if (inventory) {
            inventory.stockQuantity += item.quantity;
            await inventory.save();

            await InventoryLog.create({
              product: item.product,
              branch_id: branchId,
              quantityChange: item.quantity,
              type: "RETURN",
              referenceId: orderReturn._id,
              performedBy: userId,
            });
          }
        }
      }
    }

    const populated = await OrderReturn.findById(orderReturn._id)
      .populate("sale_id", "invoiceNumber orderType")
      .populate("processedBy", "name email");

    res.status(201).json({
      message: "Order return created successfully",
      orderReturn: populated,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error creating return", error: error.message });
  }
};

// ===== GET ALL ORDER RETURNS =====
export const getOrderReturns = async (req: AuthRequest, res: Response) => {
  try {
    const branchId = req.user?.branch_id;
    if (!branchId) return res.status(401).json({ message: "Unauthorized" });

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
    const skip = (page - 1) * limit;

    const query: any = { branch_id: branchId };
    if (req.query.returnType) query.returnType = String(req.query.returnType);

    const [total, orderReturns] = await Promise.all([
      OrderReturn.countDocuments(query),
      OrderReturn.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sale_id", "invoiceNumber orderType createdAt")
        .populate("processedBy", "name email"),
    ]);

    res.json({ orderReturns, total, page, limit });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching returns", error: error.message });
  }
};

// ===== GET ORDER RETURN BY ID =====
export const getOrderReturnById = async (req: AuthRequest, res: Response) => {
  try {
    const branchId = req.user?.branch_id;
    if (!branchId) return res.status(401).json({ message: "Unauthorized" });

    const orderReturn = await OrderReturn.findOne({
      _id: req.params.id,
      branch_id: branchId,
    })
      .populate("sale_id", "invoiceNumber orderType items subtotal grandTotal")
      .populate("processedBy", "name email");

    if (!orderReturn) return res.status(404).json({ message: "Return not found" });

    res.json({ orderReturn });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching return", error: error.message });
  }
};
