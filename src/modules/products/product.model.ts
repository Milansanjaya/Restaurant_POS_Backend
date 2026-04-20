import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  discount?: mongoose.Types.ObjectId | null;
  price: number;
  cost: number;
  taxRate: number;
  branch_id: string;
  isActive: boolean;
  isAvailable: boolean;
  trackStock: boolean;
  lowStockThreshold?: number;
  preparationTime?: number;
  createdBy: mongoose.Types.ObjectId;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    barcode: { type: String },
    category: { type: String, required: true },
    discount: { type: Schema.Types.ObjectId, ref: "Discount", default: null },
    price: { type: Number, required: true },
    cost: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
    branch_id: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    trackStock: { type: Boolean, default: false },
    lowStockThreshold: { type: Number, default: 5 },
    preparationTime: { type: Number },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export default mongoose.model<IProduct>("Product", ProductSchema);