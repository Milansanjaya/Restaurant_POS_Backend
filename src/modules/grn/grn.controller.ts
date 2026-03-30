import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import GRN from "./grn.model";
import PurchaseOrder from "../purchase-orders/purchaseOrder.model";
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
    const { purchaseOrder_id, items, batches, notes } = req.body;

    const purchaseOrder = await PurchaseOrder.findOne({
      _id: purchaseOrder_id,
      branch_id: req.user?.branch_id
    });

    if (!purchaseOrder) {
      return res.status(404).json({ message: "Purchase Order not found" });
    }

    if (purchaseOrder.status !== "APPROVED") {
      return res.status(400).json({
        message: "Only approved POs can have GRNs"
      });
    }

    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + item.totalPrice,
      0
    );

    const grnNumber = await generateGRNNumber(req.user?.branch_id!);

    const grn = await GRN.create({
      grnNumber,
      purchaseOrder_id,
      supplier_id: purchaseOrder.supplier_id,
      items,
      batches,
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
      await Batch.create({
        ...batchData,
        product_id: grn.items[0].product_id,
        branch_id: req.user?.branch_id,
        quantity: batchData.quantity
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
