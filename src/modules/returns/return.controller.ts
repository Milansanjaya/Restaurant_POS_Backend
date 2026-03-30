import { Request, Response } from "express";
import SupplierReturn from "./supplierReturn.model";
import Supplier from "../suppliers/supplier.model";
import SupplierTransaction from "../suppliers/supplierTransaction.model";
import Inventory from "../inventory/inventory.model";

export class ReturnController {
  // Create supplier return
  async createReturn(req: Request, res: Response) {
    try {
      const { supplier_id, grn_id, items, notes } = req.body;
      const branch_id = req.body.branch_id;
      const userId = req.body.userId;

      // Generate return number
      const lastReturn = await SupplierReturn.findOne({ branch_id }).sort({ createdAt: -1 });
      let returnNumber = 1;
      if (lastReturn && lastReturn.returnNumber) {
        const lastNumber = parseInt(lastReturn.returnNumber.split('-')[1]);
        returnNumber = lastNumber + 1;
      }
      const returnNumberStr = `RET-${String(returnNumber).padStart(6, '0')}`;

      // Calculate total
      const totalAmount = items.reduce((sum: number, item: any) => 
        sum + item.totalPrice, 0);

      const supplierReturn = new SupplierReturn({
        returnNumber: returnNumberStr,
        supplier_id,
        grn_id,
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
      res.status(500).json({
        success: false,
        message: "Error creating return",
        error: error.message
      });
    }
  }

  // Get all returns
  async getAllReturns(req: Request, res: Response) {
    try {
      const branch_id = req.body.branch_id;
      const { status, supplier_id, page = 1, limit = 10 } = req.query;

      const query: any = { branch_id };
      
      if (status) query.status = status;
      if (supplier_id) query.supplier_id = supplier_id;

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
  async getReturnById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const branch_id = req.body.branch_id;

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
  async approveReturn(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const branch_id = req.body.branch_id;
      const userId = req.body.userId;

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
      for (const item of supplierReturn.items) {
        await Inventory.findOneAndUpdate(
          { 
            product_id: item.product_id, 
            branch_id 
          },
          { 
            $inc: { quantity: -item.quantity } 
          }
        );
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
