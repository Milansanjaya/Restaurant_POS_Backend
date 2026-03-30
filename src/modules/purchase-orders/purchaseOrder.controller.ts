import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import PurchaseOrder from "./purchaseOrder.model";
import Supplier from "../suppliers/supplier.model";
import SupplierTransaction from "../suppliers/supplierTransaction.model";

// Generate PO number
const generatePONumber = async (branchId: string): Promise<string> => {
  const lastPO = await PurchaseOrder.findOne({ branch_id: branchId })
    .sort({ createdAt: -1 });
  const lastNumber = lastPO ? parseInt(lastPO.poNumber.split("-")[1]) : 0;
  return `PO-${String(lastNumber + 1).padStart(6, "0")}`;
};

export const createPurchaseOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { supplier_id, items, deliveryDate, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Items are required" });
    }

    const supplier = await Supplier.findOne({
      _id: supplier_id,
      branch_id: req.user?.branch_id
    });

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + item.totalPrice,
      0
    );

    const poNumber = await generatePONumber(req.user?.branch_id!);

    const purchaseOrder = await PurchaseOrder.create({
      poNumber,
      supplier_id,
      items,
      totalAmount,
      branch_id: req.user?.branch_id,
      deliveryDate,
      notes,
      createdBy: req.user?._id
    });

    res.status(201).json({
      message: "Purchase Order created successfully",
      purchaseOrder
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getPurchaseOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { status, supplierId, page = 1, limit = 10 } = req.query;
    const query: any = { branch_id: req.user?.branch_id };

    if (status) query.status = status;
    if (supplierId) query.supplier_id = supplierId;

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate("supplier_id")
      .populate("createdBy", "name email")
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await PurchaseOrder.countDocuments(query);

    res.status(200).json({
      purchaseOrders,
      pagination: { page, limit, total, pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getPurchaseOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: req.params.id,
      branch_id: req.user?.branch_id
    }).populate("supplier_id");

    if (!purchaseOrder) {
      return res.status(404).json({ message: "Purchase Order not found" });
    }

    res.status(200).json(purchaseOrder);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const approvePurchaseOrder = async (req: AuthRequest, res: Response) => {
  try {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: req.params.id,
      branch_id: req.user?.branch_id
    });

    if (!purchaseOrder) {
      return res.status(404).json({ message: "Purchase Order not found" });
    }

    if (purchaseOrder.status !== "PENDING") {
      return res.status(400).json({
        message: `Cannot approve PO with status: ${purchaseOrder.status}`
      });
    }

    purchaseOrder.status = "APPROVED";
    purchaseOrder.approvedBy = req.user?._id;
    purchaseOrder.approvedAt = new Date();
    await purchaseOrder.save();

    // Create transaction
    await SupplierTransaction.create({
      supplier_id: purchaseOrder.supplier_id,
      transactionType: "PURCHASE",
      amount: purchaseOrder.totalAmount,
      description: `Purchase Order ${purchaseOrder.poNumber}`,
      referenceDocument: purchaseOrder.poNumber,
      branch_id: req.user?.branch_id,
      createdBy: req.user?._id
    });

    // Update supplier outstanding balance
    await Supplier.findByIdAndUpdate(purchaseOrder.supplier_id, {
      $inc: { outstandingBalance: purchaseOrder.totalAmount }
    });

    res.status(200).json({
      message: "Purchase Order approved successfully",
      purchaseOrder
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const cancelPurchaseOrder = async (req: AuthRequest, res: Response) => {
  try {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: req.params.id,
      branch_id: req.user?.branch_id
    });

    if (!purchaseOrder) {
      return res.status(404).json({ message: "Purchase Order not found" });
    }

    if (["RECEIVED", "CANCELLED"].includes(purchaseOrder.status)) {
      return res.status(400).json({
        message: `Cannot cancel PO with status: ${purchaseOrder.status}`
      });
    }

    purchaseOrder.status = "CANCELLED";
    await purchaseOrder.save();

    res.status(200).json({
      message: "Purchase Order cancelled successfully",
      purchaseOrder
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
