import { Request, Response } from "express";
import Batch from "./batch.model";
import Product from "../products/product.model";

export class BatchController {
  // Create batch (usually from GRN)
  async createBatch(req: Request, res: Response) {
    try {
      const {
        batchNumber,
        product_id,
        quantity,
        costPerUnit,
        expiryDate,
        manufactureDate,
        supplier_id,
        grn_id
      } = req.body;
      const branch_id = req.body.branch_id;
      const userId = req.body.userId;

      const totalCost = quantity * costPerUnit;

      const batch = new Batch({
        batchNumber,
        product_id,
        branch_id,
        quantity,
        remainingQuantity: quantity,
        costPerUnit,
        totalCost,
        expiryDate,
        manufactureDate,
        supplier_id,
        grn_id,
        createdBy: userId
      });

      await batch.save();

      res.status(201).json({
        success: true,
        message: "Batch created successfully",
        data: batch
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error creating batch",
        error: error.message
      });
    }
  }

  // Get all batches
  async getAllBatches(req: Request, res: Response) {
    try {
      const branch_id = req.body.branch_id;
      const { status, alertStatus, product_id, page = 1, limit = 20 } = req.query;

      const query: any = { branch_id };
      
      if (status) query.status = status;
      if (alertStatus) query.alertStatus = alertStatus;
      if (product_id) query.product_id = product_id;

      const skip = (Number(page) - 1) * Number(limit);

      const batches = await Batch.find(query)
        .populate('product_id', 'name sku')
        .populate('supplier_id', 'name code')
        .sort({ expiryDate: 1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Batch.countDocuments(query);

      res.status(200).json({
        success: true,
        data: batches,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching batches",
        error: error.message
      });
    }
  }

  // Get near-expiry batches (30 days)
  async getNearExpiryBatches(req: Request, res: Response) {
    try {
      const branch_id = req.body.branch_id;
      const { days = 30 } = req.query;

      const batches = await Batch.find({
        branch_id,
        status: 'ACTIVE',
        daysUntilExpiry: { $lte: Number(days), $gt: 0 }
      })
        .populate('product_id', 'name sku')
        .populate('supplier_id', 'name code')
        .sort({ daysUntilExpiry: 1 });

      res.status(200).json({
        success: true,
        data: batches,
        count: batches.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching near-expiry batches",
        error: error.message
      });
    }
  }

  // Get expired batches
  async getExpiredBatches(req: Request, res: Response) {
    try {
      const branch_id = req.body.branch_id;

      const batches = await Batch.find({
        branch_id,
        $or: [
          { status: 'EXPIRED' },
          { alertStatus: 'EXPIRED' }
        ]
      })
        .populate('product_id', 'name sku')
        .populate('supplier_id', 'name code')
        .sort({ expiryDate: -1 });

      res.status(200).json({
        success: true,
        data: batches,
        count: batches.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching expired batches",
        error: error.message
      });
    }
  }

  // Block/unblock batch
  async toggleBlockBatch(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { block, reason } = req.body;
      const branch_id = req.body.branch_id;

      const batch = await Batch.findOne({ _id: id, branch_id });
      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found"
        });
      }

      batch.status = block ? 'BLOCKED' : 'ACTIVE';
      await batch.save();

      res.status(200).json({
        success: true,
        message: `Batch ${block ? 'blocked' : 'unblocked'} successfully`,
        data: batch
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error updating batch status",
        error: error.message
      });
    }
  }

  // Get batch by ID
  async getBatchById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const branch_id = req.body.branch_id;

      const batch = await Batch.findOne({ _id: id, branch_id })
        .populate('product_id')
        .populate('supplier_id')
        .populate('grn_id');

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found"
        });
      }

      res.status(200).json({
        success: true,
        data: batch
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching batch",
        error: error.message
      });
    }
  }

  // Expiry dashboard
  async getExpiryDashboard(req: Request, res: Response) {
    try {
      const branch_id = req.body.branch_id;

      const [
        totalBatches,
        activeBatches,
        expiredBatches,
        criticalBatches,
        warningBatches
      ] = await Promise.all([
        Batch.countDocuments({ branch_id }),
        Batch.countDocuments({ branch_id, status: 'ACTIVE' }),
        Batch.countDocuments({ branch_id, alertStatus: 'EXPIRED' }),
        Batch.countDocuments({ branch_id, alertStatus: 'CRITICAL' }),
        Batch.countDocuments({ branch_id, alertStatus: 'WARNING' })
      ]);

      const criticalBatchList = await Batch.find({
        branch_id,
        alertStatus: 'CRITICAL',
        status: 'ACTIVE'
      })
        .populate('product_id', 'name sku')
        .sort({ daysUntilExpiry: 1 })
        .limit(10);

      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalBatches,
            activeBatches,
            expiredBatches,
            criticalBatches,
            warningBatches
          },
          criticalBatches: criticalBatchList
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching expiry dashboard",
        error: error.message
      });
    }
  }

  // Update batch quantity (for stock deduction)
  async updateBatchQuantity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { quantity } = req.body;
      const branch_id = req.body.branch_id;

      const batch = await Batch.findOne({ _id: id, branch_id });
      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found"
        });
      }

      batch.remainingQuantity -= quantity;
      await batch.save();

      res.status(200).json({
        success: true,
        message: "Batch quantity updated",
        data: batch
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error updating batch quantity",
        error: error.message
      });
    }
  }
}

export default new BatchController();
