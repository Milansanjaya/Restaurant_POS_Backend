import mongoose, { Schema, Document } from "mongoose";

export interface ISupplierReturn extends Document {
  returnNumber: string;
  supplier_id: mongoose.Types.ObjectId;
  grn_id?: mongoose.Types.ObjectId;
  branch_id: string;
  items: {
    product_id: mongoose.Types.ObjectId;
    productName: string;
    batch_id?: mongoose.Types.ObjectId;
    quantity: number;
    reason: string;
    unitPrice: number;
    totalPrice: number;
  }[];
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED';
  debitNoteNumber?: string;
  returnDate: Date;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
}

const SupplierReturnSchema = new Schema<ISupplierReturn>(
  {
    returnNumber: { type: String, required: true, unique: true },
    supplier_id: { 
      type: Schema.Types.ObjectId, 
      ref: "Supplier", 
      required: true 
    },
    grn_id: { type: Schema.Types.ObjectId, ref: "GRN" },
    branch_id: { type: String, required: true },
    items: [{
      product_id: { type: Schema.Types.ObjectId, ref: "Product", required: true },
      productName: { type: String, required: true },
      batch_id: { type: Schema.Types.ObjectId, ref: "Batch" },
      quantity: { type: Number, required: true },
      reason: { type: String, required: true },
      unitPrice: { type: Number, required: true },
      totalPrice: { type: Number, required: true }
    }],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'COMPLETED'],
      default: 'PENDING'
    },
    debitNoteNumber: { type: String },
    returnDate: { type: Date, default: Date.now },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

SupplierReturnSchema.index({ branch_id: 1, status: 1 });
SupplierReturnSchema.index({ supplier_id: 1 });
SupplierReturnSchema.index({ returnNumber: 1 });

export default mongoose.model<ISupplierReturn>("SupplierReturn", SupplierReturnSchema);
