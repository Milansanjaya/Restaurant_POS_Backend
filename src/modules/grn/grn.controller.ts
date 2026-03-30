import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../middleware/auth.middleware";
import GRN from "./grn.model";
import PurchaseOrder from "../purchase-orders/purchaseOrder.model";
import Supplier from "../suppliers/supplier.model";
import SupplierTransaction from "../suppliers/supplierTransaction.model";
import Inventory from "../inventory/inventory.model";
import Batch from "../batches/batch.model";

// Generate GRN number
const generateGRNNumber = async (branchId: string): Promise<string> => {
  const lastGRN = await GRN.findOne({ branch_id: branchId })
    .sort({ createdAt: -1 });
  const lastNumber = lastGRN ? parseInt(lastGRN.grnNumber.split("-")[1]) : 0;
  return `GRN-${String(lastNumber + 1).padStart(6, "0")}`;
};

export const createGRN = async (req: AuthRequest, res: Response) => {
  try {
    const purchaseOrderId = req.body?.purchaseOrder_id ?? req.body?.purchaseOrderId;
    const itemsRaw = req.body?.items;
    const batchesRaw = req.body?.batches;
    const notes = req.body?.notes;

    if (!purchaseOrderId || !mongoose.isValidObjectId(purchaseOrderId)) {
      return res.status(400).json({ message: "Invalid purchaseOrder_id" });
    }

    // Accept items as array OR a single object
    const itemsArray: any[] = Array.isArray(itemsRaw)
      ? itemsRaw
      : (itemsRaw && typeof itemsRaw === "object" && (itemsRaw.product_id || itemsRaw.productName))
        ? [itemsRaw]
        : [];

    if (!Array.isArray(itemsArray) || itemsArray.length === 0) {
      return res.status(400).json({ message: "items are required" });
    }

    const normalizeQualityStatus = (value: any) => {
      const v = String(value || "").toUpperCase();
      if (["ACCEPTED", "REJECTED", "PARTIAL"].includes(v)) return v;
      if (["APPROVED", "ACCEPT"].includes(v)) return "ACCEPTED";
      return undefined;
    };

    const topQualityStatus = normalizeQualityStatus(req.body?.qualityStatus);

    const normalizedItems = itemsArray.map((item: any) => {
      const productId = item?.product_id ?? item?.productId;
      const purchasedQuantity = Number(
        item?.purchasedQuantity ?? item?.orderedQuantity ?? item?.purchasedQty
      );
      const receivedQuantity = Number(item?.receivedQuantity ?? item?.receivedQty);
      const unitPrice = Number(item?.unitPrice);
      const totalPrice = Number.isFinite(Number(item?.totalPrice))
        ? Number(item?.totalPrice)
        : receivedQuantity * unitPrice;
      const qualityStatus =
        normalizeQualityStatus(item?.qualityStatus) || topQualityStatus || "ACCEPTED";

      return {
        product_id: productId,
        productName: item?.productName,
        purchasedQuantity,
        receivedQuantity,
        unitPrice,
        totalPrice,
        qualityStatus,
        rejectionReason: item?.rejectionReason
      };
    });

    for (const item of normalizedItems) {
      if (!item.product_id || !mongoose.isValidObjectId(item.product_id)) {
        return res.status(400).json({ message: "Invalid product_id in items" });
      }
      if (!item.productName) {
        return res.status(400).json({ message: "productName is required in items" });
      }
      if (!Number.isFinite(item.purchasedQuantity) || item.purchasedQuantity <= 0) {
        return res
          .status(400)
          .json({ message: "purchasedQuantity is required in items" });
      }
      if (!Number.isFinite(item.receivedQuantity) || item.receivedQuantity < 0) {
        return res
          .status(400)
          .json({ message: "receivedQuantity must be a valid number" });
      }
    }

    // Normalize batches: accept explicit batches OR derive from items' batchNumber/expiryDate
    const batchesArray: any[] = Array.isArray(batchesRaw) ? batchesRaw : [];
    if (batchesArray.length === 0) {
      for (const src of itemsArray) {
        if (src?.batchNumber && src?.expiryDate) {
          batchesArray.push({
            batchNumber: src.batchNumber,
            expiryDate: src.expiryDate,
            quantity: Number(src.receivedQuantity ?? 0),
            costPerUnit: Number(src.unitPrice ?? 0),
            product_id: src.product_id ?? src.productId
          });
        }
      }
    }

    const purchaseOrder = await PurchaseOrder.findOne({
      _id: purchaseOrderId,
      branch_id: req.user?.branch_id
    });

    if (!purchaseOrder) {
      return res.status(404).json({ message: "Purchase Order not found" });
    }

    // If PO is still DRAFT/PENDING, auto-approve it once so GRN flow works end-to-end.
    if (["DRAFT", "PENDING"].includes(purchaseOrder.status)) {
      purchaseOrder.status = "APPROVED";
      purchaseOrder.approvedBy = req.user?._id;
      purchaseOrder.approvedAt = new Date();
      await purchaseOrder.save();

      const existingTxn = await SupplierTransaction.findOne({
        transactionType: "PURCHASE",
        referenceDocument: purchaseOrder.poNumber,
        branch_id: req.user?.branch_id
      });

      if (!existingTxn) {
        await SupplierTransaction.create({
          supplier_id: purchaseOrder.supplier_id,
          transactionType: "PURCHASE",
          amount: purchaseOrder.totalAmount,
          description: `Purchase Order ${purchaseOrder.poNumber}`,
          referenceDocument: purchaseOrder.poNumber,
          branch_id: req.user?.branch_id,
          createdBy: req.user?._id
        });

        await Supplier.findByIdAndUpdate(purchaseOrder.supplier_id, {
          $inc: { outstandingBalance: purchaseOrder.totalAmount }
        });
      }
    }

    if (purchaseOrder.status !== "APPROVED") {
      return res.status(400).json({
        message: `Cannot create GRN for PO with status: ${purchaseOrder.status}`
      });
    }

    const totalAmount = normalizedItems.reduce(
      (sum: number, item: any) => sum + Number(item.totalPrice || 0),
      0
    );

    const grnNumber = await generateGRNNumber(req.user?.branch_id!);

    const grn = await GRN.create({
      grnNumber,
      purchaseOrder_id: purchaseOrderId,
      supplier_id: purchaseOrder.supplier_id,
      items: normalizedItems,
      batches: batchesArray,
      totalAmount,
      branch_id: req.user?.branch_id,
      notes,
      createdBy: req.user?._id
    });

    res.status(201).json({
      message: "GRN created successfully",
      grn
    });
  } catch (error: any) {
    if (error?.name === "CastError") {
      return res.status(400).json({ message: "Invalid id" });
    }
    if (error?.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

export const approveGRN = async (req: AuthRequest, res: Response) => {
  try {
    const grn = await GRN.findOne({
      _id: req.params.id,
      branch_id: req.user?.branch_id
    });

    if (!grn) {
      return res.status(404).json({ message: "GRN not found" });
    }

    if (grn.status !== "DRAFT") {
      return res.status(400).json({
        message: `Cannot approve GRN with status: ${grn.status}`
      });
    }

    // Update inventory for each item
    for (const item of grn.items) {
      if (item.qualityStatus === "ACCEPTED" || item.qualityStatus === "PARTIAL") {
        let inventory = await Inventory.findOne({
          product: item.product_id,
          branch_id: req.user?.branch_id
        });

        if (!inventory) {
          inventory = await Inventory.create({
            product: item.product_id,
            branch_id: req.user?.branch_id,
            stockQuantity: 0
          });
        }

        inventory.stockQuantity += item.receivedQuantity;
        await inventory.save();
      }
    }

    // Create batches if provided
    for (const batchData of grn.batches) {
      const productId = (batchData as any).product_id || grn.items[0].product_id;
      const qty = Number(batchData.quantity || 0);
      const cpu = Number(batchData.costPerUnit || 0);

      await Batch.create({
        batchNumber: batchData.batchNumber,
        product_id: productId,
        branch_id: req.user?.branch_id,
        quantity: qty,
        remainingQuantity: qty,
        costPerUnit: cpu,
        totalCost: qty * cpu,
        expiryDate: batchData.expiryDate,
        supplier_id: grn.supplier_id,
        grn_id: grn._id,
        createdBy: req.user?._id
      });
    }

    grn.status = "APPROVED";
    grn.approvedBy = req.user?._id;
    grn.approvedAt = new Date();
    await grn.save();

    res.status(200).json({
      message: "GRN approved successfully and inventory updated",
      grn
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getGRNs = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query: any = { branch_id: req.user?.branch_id };

    if (status) query.status = status;

    const grns = await GRN.find(query)
      .populate("supplier_id")
      .populate("purchaseOrder_id")
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await GRN.countDocuments(query);

    res.status(200).json({
      grns,
      pagination: { page, limit, total, pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getGRNById = async (req: AuthRequest, res: Response) => {
  try {
    const grn = await GRN.findOne({
      _id: req.params.id,
      branch_id: req.user?.branch_id
    }).populate("supplier_id");

    if (!grn) {
      return res.status(404).json({ message: "GRN not found" });
    }

    res.status(200).json(grn);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
