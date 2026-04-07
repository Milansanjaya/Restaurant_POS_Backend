import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../middleware/auth.middleware";
import SupplierReturn from "./supplierReturn.model";
import Supplier from "../suppliers/supplier.model";
import SupplierTransaction from "../suppliers/supplierTransaction.model";
import Inventory from "../inventory/inventory.model";

const normalizeId = (v: any) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  return v;
};

const isValidObjectId = (v: any) =>
  v !== undefined && mongoose.Types.ObjectId.isValid(String(v));

export class ReturnController {
  // Create supplier return
  async createReturn(req: AuthRequest, res: Response) {
    try {
      const body = (req.body || {}) as any;
      const branch_id = req.user?.branch_id || body.branch_id;
      const userId = req.user?._id;

      if (!branch_id || !userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
      }

      const supplier_id = normalizeId(body.supplier_id ?? body.supplierId);
      const grn_id = normalizeId(body.grn_id ?? body.grnId);
      const notes = body.notes;

      if (!supplier_id || !isValidObjectId(supplier_id)) {
        return res.status(400).json({
          success: false,
          message: "Valid supplier_id is required"
        });
      }

      if (grn_id !== undefined && !isValidObjectId(grn_id)) {
        return res.status(400).json({
          success: false,
          message: "grn_id must be a valid id"
        });
      }

      const itemsInput = Array.isArray(body.items) ? body.items : [];
      if (itemsInput.length === 0) {
        return res.status(400).json({
          success: false,
          message: "items is required"
        });
      }

      const items = itemsInput.map((item: any, idx: number) => {
        const product_id = normalizeId(item.product_id ?? item.productId);
        const batch_id = normalizeId(item.batch_id ?? item.batchId);
        const productName = item.productName;
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        const reason = item.reason;

        if (!product_id || !isValidObjectId(product_id)) {
          throw new Error(`Invalid product_id at items[${idx}]`);
        }

        if (batch_id !== undefined && !isValidObjectId(batch_id)) {
          throw new Error(`Invalid batch_id at items[${idx}]`);
        }

        if (!productName || typeof productName !== "string") {
          throw new Error(`productName is required at items[${idx}]`);
        }

        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error(`quantity must be > 0 at items[${idx}]`);
        }

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new Error(`unitPrice must be >= 0 at items[${idx}]`);
        }

        if (!reason || typeof reason !== "string") {
          throw new Error(`reason is required at items[${idx}]`);
        }

        const totalPrice = Number(item.totalPrice);
        const computedTotal = Number.isFinite(totalPrice)
          ? totalPrice
          : unitPrice * quantity;

        return {
          product_id,
          productName,
          batch_id,
          quantity,
          reason,
          unitPrice,
          totalPrice: computedTotal
        };
      });

      // Generate return number
      const lastReturn = await SupplierReturn.findOne({ branch_id }).sort({
        createdAt: -1
      });
      let returnNumber = 1;
      if (lastReturn && lastReturn.returnNumber) {
        const lastNumber = parseInt(lastReturn.returnNumber.split("-")[1]);
        returnNumber = lastNumber + 1;
      }
      const returnNumberStr = `RET-${String(returnNumber).padStart(6, "0")}`;

      const totalAmount = items.reduce(
        (sum: number, item: any) => sum + Number(item.totalPrice || 0),
        0
      );

      const supplierReturn = new SupplierReturn({
        returnNumber: returnNumberStr,
        supplier_id,
        grn_id: grn_id || undefined,
        branch_id,
        items,
        totalAmount,
        notes,
        createdBy: userId
      });

      await supplierReturn.save();

      res.status(201).json({
        success: true,
        message: "Return created successfully",
        data: supplierReturn
      });
    } catch (error: any) {
      const msg = error?.message || "Error creating return";

      // Convert common mongoose cast/validation issues to 400
      if (
        error?.name === "CastError" ||
        error?.name === "ValidationError" ||
        msg.toLowerCase().includes("invalid")
      ) {
        return res.status(400).json({
          success: false,
          message: msg
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating return",
        error: msg
      });
    }
  }

  // Get all returns
  async getAllReturns(req: AuthRequest, res: Response) {
    try {
      const branch_id = req.user?.branch_id;
      const { status, supplier_id, page = 1, limit = 10 } = req.query;

      if (!branch_id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
      }

      const query: any = { branch_id };

      if (status) query.status = status;
      if (supplier_id) {
        const sid = normalizeId(supplier_id);
        if (sid !== undefined && !isValidObjectId(sid)) {
          return res.status(400).json({
            success: false,
            message: "supplier_id must be a valid id"
          });
        }
        query.supplier_id = sid;
      }

      const skip = (Number(page) - 1) * Number(limit);

      const returns = await SupplierReturn.find(query)
        .populate('supplier_id', 'name code')
        .populate('grn_id', 'grnNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await SupplierReturn.countDocuments(query);

      res.status(200).json({
        success: true,
        data: returns,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching returns",
        error: error.message
      });
    }
  }

  // Get return by ID
  async getReturnById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const branch_id = req.user?.branch_id;

      if (!branch_id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
      }

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid return id"
        });
      }

      const supplierReturn = await SupplierReturn.findOne({ _id: id, branch_id })
        .populate('supplier_id')
        .populate('grn_id')
        .populate('items.product_id', 'name sku');

      if (!supplierReturn) {
        return res.status(404).json({
          success: false,
          message: "Return not found"
        });
      }

      res.status(200).json({
        success: true,
        data: supplierReturn
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching return",
        error: error.message
      });
    }
  }

  // Approve return (deduct stock and update supplier balance)
  async approveReturn(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const branch_id = req.user?.branch_id;
      const userId = req.user?._id;

      if (!branch_id || !userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
      }

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid return id"
        });
      }

      const supplierReturn = await SupplierReturn.findOne({ _id: id, branch_id });

      if (!supplierReturn) {
        return res.status(404).json({
          success: false,
          message: "Return not found"
        });
      }

      if (supplierReturn.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: "Only pending returns can be approved"
        });
      }

      // Deduct stock from inventory
      for (const item of supplierReturn.items as any[]) {
        const inventory = await Inventory.findOne({
          product: item.product_id,
          branch_id,
          isActive: true
        });

        if (!inventory) {
          return res.status(404).json({
            success: false,
            message: "Inventory not found for a returned product"
          });
        }

        if (inventory.stockQuantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: "Insufficient stock to approve this return"
          });
        }

        inventory.stockQuantity -= item.quantity;
        await inventory.save();
      }

      // Update supplier outstanding balance (reduce)
      const supplier = await Supplier.findById(supplierReturn.supplier_id);
      if (supplier) {
        supplier.outstandingBalance -= supplierReturn.totalAmount;
        await supplier.save();

        // Create supplier transaction
        const transaction = new SupplierTransaction({
          supplier_id: supplierReturn.supplier_id,
          type: 'RETURN',
          amount: -supplierReturn.totalAmount,
          balance: supplier.outstandingBalance,
          reference_id: supplierReturn._id,
          referenceType: 'Return',
          date: new Date(),
          notes: `Supplier return ${supplierReturn.returnNumber}`,
          branch_id,
          createdBy: userId
        });
        await transaction.save();
      }

      // Update return status
      supplierReturn.status = 'APPROVED';
      supplierReturn.debitNoteNumber = `DN-${supplierReturn.returnNumber}`;
      await supplierReturn.save();

      res.status(200).json({
        success: true,
        message: "Return approved successfully",
        data: supplierReturn
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error approving return",
        error: error.message
      });
    }
  }
}

export default new ReturnController();
