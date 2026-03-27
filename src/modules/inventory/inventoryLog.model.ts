import mongoose, { Schema, Document } from "mongoose";

export interface IInventoryLog extends Document {
  product: mongoose.Types.ObjectId;
  branch_id: string;
  quantityChange: number;
  type: "SALE" | "PURCHASE" | "ADJUSTMENT" | "RETURN";
  referenceId?: mongoose.Types.ObjectId;
  performedBy: mongoose.Types.ObjectId;
}

const InventoryLogSchema = new Schema<IInventoryLog>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    branch_id: { type: String, required: true },
    quantityChange: { type: Number, required: true },
    type: {
      type: String,
      enum: ["SALE", "PURCHASE", "ADJUSTMENT", "RETURN"],
      required: true
    },
    referenceId: { type: Schema.Types.ObjectId },
    performedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export default mongoose.model<IInventoryLog>("InventoryLog", InventoryLogSchema);