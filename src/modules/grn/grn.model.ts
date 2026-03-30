import mongoose, { Schema, Document } from "mongoose";

export interface IGRNItem {
  product_id: mongoose.Types.ObjectId;
  productName: string;
  receivedQuantity: number;
  purchasedQuantity: number;
  unitPrice: number;
  totalPrice: number;
  qualityStatus: "ACCEPTED" | "REJECTED" | "PARTIAL";
  rejectionReason?: string;
}

export interface IGRNBatch {
  batchNumber: string;
  product_id?: mongoose.Types.ObjectId;
  expiryDate: Date;
  quantity: number;
  costPerUnit: number;
}

export interface IGRN extends Document {
  grnNumber: string;
  purchaseOrder_id: mongoose.Types.ObjectId;
  supplier_id: mongoose.Types.ObjectId;
  items: IGRNItem[];
  batches: IGRNBatch[];
  totalAmount: number;
  status: "DRAFT" | "APPROVED" | "RECEIVED" | "REJECTED";
  receivedDate: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  branch_id: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
}

const GRNItemSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  receivedQuantity: { type: Number, required: true },
  purchasedQuantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  qualityStatus: {
    type: String,
    enum: ["ACCEPTED", "REJECTED", "PARTIAL"],
    default: "ACCEPTED"
  },
  rejectionReason: { type: String }
});

const BatchSchema = new Schema({
  batchNumber: { type: String, required: true },
  // Optional: if provided, approval can create correct product batches per item
  product_id: { type: Schema.Types.ObjectId, ref: "Product" },
  expiryDate: { type: Date, required: true },
  quantity: { type: Number, required: true },
  costPerUnit: { type: Number, required: true }
});

const GRNSchema = new Schema<IGRN>(
  {
    grnNumber: { type: String, required: true, unique: true },
    purchaseOrder_id: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true
    },
    supplier_id: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    items: [GRNItemSchema],
    batches: [BatchSchema],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["DRAFT", "APPROVED", "RECEIVED", "REJECTED"],
      default: "DRAFT"
    },
    receivedDate: { type: Date, default: Date.now },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    branch_id: { type: String, required: true },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

GRNSchema.index({ branch_id: 1, status: 1 });
GRNSchema.index({ purchaseOrder_id: 1 });
GRNSchema.index({ grnNumber: 1 });

export default mongoose.model<IGRN>("GRN", GRNSchema);
