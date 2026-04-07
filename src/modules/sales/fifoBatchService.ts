import mongoose from "mongoose";
import Batch from "../batches/batch.model";
import Inventory from "../inventory/inventory.model";
import InventoryLog from "../inventory/inventoryLog.model";

export interface BatchDeduction {
  batch_id: mongoose.Types.ObjectId;
  batchNumber: string;
  quantityDeducted: number;
}

/**
 * FIFO Batch Deduction Service
 * Automatically selects oldest batches first (by receivedDate)
 * Deducts from multiple batches if needed
 */
export class FIFOBatchService {
  /**
   * Deduct inventory using FIFO (First In, First Out) method
   * @param productId - Product to deduct from
   * @param requiredQuantity - Total quantity needed
   * @param branchId - Branch ID
   * @param saleId - Sale reference (for audit)
   * @param userId - User performing the action
   * @returns Array of batch deductions
   */
  static async deductFromBatchesFIFO(
    productId: string | mongoose.Types.ObjectId,
    requiredQuantity: number,
    branchId: string,
    saleId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId
  ): Promise<BatchDeduction[]> {
    const deductions: BatchDeduction[] = [];
    let remainingQuantity = requiredQuantity;

    // 1. Find all ACTIVE batches for this product, sorted by receivedDate ASC (FIFO)
    const batches = await Batch.find({
      product_id: productId,
      branch_id: branchId,
      status: "ACTIVE",
      remainingQuantity: { $gt: 0 }
    }).sort({ receivedDate: 1 }); // FIFO: Oldest first!

    if (batches.length === 0) {
      throw new Error(`No active batches found for product ${productId}`);
    }

    // 2. Deduct from batches in FIFO order
    for (const batch of batches) {
      if (remainingQuantity <= 0) break;

      const quantityFromThisBatch = Math.min(
        batch.remainingQuantity,
        remainingQuantity
      );

      // Deduct from batch
      batch.remainingQuantity -= quantityFromThisBatch;

      // Update batch status if depleted
      if (batch.remainingQuantity <= 0) {
        batch.status = "DEPLETED";
      }

      await batch.save();

      // Create inventory log entry with batch tracking
      await InventoryLog.create({
        product: productId,
        branch_id: branchId,
        quantityChange: -quantityFromThisBatch,
        type: "SALE",
        referenceId: saleId,
        batch_id: batch._id,  // FIFO: Track which batch!
        performedBy: userId
      });

      // Record deduction
      deductions.push({
        batch_id: batch._id,
        batchNumber: batch.batchNumber,
        quantityDeducted: quantityFromThisBatch
      });

      remainingQuantity -= quantityFromThisBatch;
    }

    // 3. Check if we fulfilled the order
    if (remainingQuantity > 0) {
      throw new Error(
        `Insufficient batch stock for product ${productId}. ` +
        `Needed: ${requiredQuantity}, Available: ${requiredQuantity - remainingQuantity}`
      );
    }

    // 4. Update general inventory summary
    const inventory = await Inventory.findOne({
      product: productId,
      branch_id: branchId,
      isActive: true
    });

    if (inventory) {
      inventory.stockQuantity -= requiredQuantity;
      await inventory.save();
    }

    return deductions;
  }

  /**
   * Restore inventory to specific batches (for refunds/voids)
   * @param deductions - Array of batch deductions to reverse
   * @param branchId - Branch ID
   * @param referenceId - Reference ID (sale/refund)
   * @param userId - User performing the action
   */
  static async restoreToBatches(
    deductions: BatchDeduction[],
    branchId: string,
    productId: string | mongoose.Types.ObjectId,
    referenceId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId
  ): Promise<void> {
    let totalRestored = 0;

    for (const deduction of deductions) {
      const batch = await Batch.findById(deduction.batch_id);
      
      if (batch) {
        // Add quantity back to batch
        batch.remainingQuantity += deduction.quantityDeducted;
        
        // Reactivate if was depleted
        if (batch.status === "DEPLETED" && batch.remainingQuantity > 0) {
          batch.status = "ACTIVE";
        }
        
        await batch.save();

        // Create inventory log entry
        await InventoryLog.create({
          product: productId,
          branch_id: branchId,
          quantityChange: deduction.quantityDeducted,
          type: "RETURN",
          referenceId: referenceId,
          batch_id: batch._id,
          performedBy: userId
        });

        totalRestored += deduction.quantityDeducted;
      }
    }

    // Update general inventory summary
    const inventory = await Inventory.findOne({
      product: productId,
      branch_id: branchId,
      isActive: true
    });

    if (inventory) {
      inventory.stockQuantity += totalRestored;
      await inventory.save();
    }
  }

  /**
   * Get available batches for a product (FIFO order)
   * @param productId - Product ID
   * @param branchId - Branch ID
   * @returns Array of available batches sorted by FIFO
   */
  static async getAvailableBatches(
    productId: string | mongoose.Types.ObjectId,
    branchId: string
  ) {
    return Batch.find({
      product_id: productId,
      branch_id: branchId,
      status: "ACTIVE",
      remainingQuantity: { $gt: 0 }
    })
    .sort({ receivedDate: 1 })  // FIFO order
    .populate("product_id", "name sku");
  }
}

export default FIFOBatchService;
