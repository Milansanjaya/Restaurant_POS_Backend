import mongoose, { Schema, Document } from "mongoose";

export interface IPurchaseOrderItem {
  product_id: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IPurchaseOrder extends Document {
  poNumber: string;
  supplier_id: mongoose.Types.ObjectId;
  items: IPurchaseOrderItem[];
  totalAmount: number;
  status: "DRAFT" | "PENDING" | "APPROVED" | "RECEIVED" | "CANCELLED";
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  branch_id: string;
  deliveryDate?: Date;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
}

const PurchaseOrderItemSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true }
});

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    poNumber: { type: String, required: true, unique: true },
    supplier_id: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    items: [PurchaseOrderItemSchema],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["DRAFT", "PENDING", "APPROVED", "RECEIVED", "CANCELLED"],
      default: "DRAFT"
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    branch_id: { type: String, required: true },
    deliveryDate: { type: Date },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

PurchaseOrderSchema.index({ branch_id: 1, status: 1 });
PurchaseOrderSchema.index({ supplier_id: 1, branch_id: 1 });
PurchaseOrderSchema.index({ poNumber: 1 });

export default mongoose.model<IPurchaseOrder>("PurchaseOrder", PurchaseOrderSchema);
