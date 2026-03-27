import mongoose, { Schema, Document } from "mongoose";

export interface IInventory extends Document {
  product: mongoose.Types.ObjectId;
  branch_id: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
}

const InventorySchema = new Schema<IInventory>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    branch_id: {
      type: String,
      required: true
    },
    stockQuantity: {
      type: Number,
      default: 0
    },
    lowStockThreshold: {
      type: Number,
      default: 5
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

InventorySchema.index(
  { product: 1, branch_id: 1 },
  { unique: true }
);

export default mongoose.model<IInventory>("Inventory", InventorySchema);