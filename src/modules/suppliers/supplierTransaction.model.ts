import mongoose, { Schema, Document } from "mongoose";

export interface ISupplierTransaction extends Document {
  supplier_id: mongoose.Types.ObjectId;
  transactionType: "PURCHASE" | "PAYMENT" | "RETURN" | "ADJUSTMENT";
  amount: number;
  description: string;
  referenceDocument: string; // PO number or Payment ID
  branch_id: string;
  createdBy: mongoose.Types.ObjectId;
}

const SupplierTransactionSchema = new Schema<ISupplierTransaction>(
  {
    supplier_id: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    transactionType: {
      type: String,
      enum: ["PURCHASE", "PAYMENT", "RETURN", "ADJUSTMENT"],
      required: true
    },
    amount: { type: Number, required: true },
    description: { type: String },
    referenceDocument: { type: String },
    branch_id: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

SupplierTransactionSchema.index({ supplier_id: 1, branch_id: 1 });
SupplierTransactionSchema.index({ createdAt: -1 });

export default mongoose.model<ISupplierTransaction>(
  "SupplierTransaction",
  SupplierTransactionSchema
);
