import mongoose, { Schema, Document } from "mongoose";

export interface ISupplierTransaction extends Document {
  supplier_id: mongoose.Types.ObjectId;
  type?: 'PURCHASE' | 'PAYMENT' | 'RETURN' | 'ADJUSTMENT';
  transactionType?: 'PURCHASE' | 'PAYMENT' | 'RETURN' | 'ADJUSTMENT';
  amount: number;
  balance?: number;
  description?: string;
  reference_id?: mongoose.Types.ObjectId;
  referenceType?: 'PurchaseOrder' | 'Payment' | 'Return';
  referenceDocument?: string;
  date: Date;
  notes?: string;
  branch_id: string;
  createdBy: mongoose.Types.ObjectId;
}

const SupplierTransactionSchema = new Schema<ISupplierTransaction>(
  {
    supplier_id: { 
      type: Schema.Types.ObjectId, 
      ref: "Supplier", 
      required: true 
    },
    type: { 
      type: String, 
      enum: ['PURCHASE', 'PAYMENT', 'RETURN', 'ADJUSTMENT']
    },
    transactionType: { 
      type: String, 
      enum: ['PURCHASE', 'PAYMENT', 'RETURN', 'ADJUSTMENT']
    },
    amount: { type: Number, required: true },
    balance: { type: Number },
    description: { type: String },
    reference_id: { type: Schema.Types.ObjectId },
    referenceType: { 
      type: String, 
      enum: ['PurchaseOrder', 'Payment', 'Return'] 
    },
    referenceDocument: { type: String },
    date: { type: Date, default: Date.now },
    notes: { type: String },
    branch_id: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

SupplierTransactionSchema.index({ supplier_id: 1, date: -1 });
SupplierTransactionSchema.index({ branch_id: 1 });

export default mongoose.model<ISupplierTransaction>(
  "SupplierTransaction", 
  SupplierTransactionSchema
);
