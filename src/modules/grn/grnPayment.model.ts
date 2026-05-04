import mongoose, { Schema, Document } from "mongoose";

export type GRNPaymentMethod = "CASH" | "BANK_TRANSFER" | "CHEQUE";

export interface IGRNPayment extends Document {
  grn_id: mongoose.Types.ObjectId;
  supplier_id: mongoose.Types.ObjectId;
  amount: number;
  paymentMethod: GRNPaymentMethod;
  reference?: string;
  notes?: string;
  date: Date;
  branch_id: string;
  createdBy: mongoose.Types.ObjectId;
}

const GRNPaymentSchema = new Schema<IGRNPayment>(
  {
    grn_id: { type: Schema.Types.ObjectId, ref: "GRN", required: true },
    supplier_id: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["CASH", "BANK_TRANSFER", "CHEQUE"],
      required: true
    },
    reference: { type: String },
    notes: { type: String },
    date: { type: Date, default: Date.now },
    branch_id: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

GRNPaymentSchema.index({ branch_id: 1, createdAt: -1 });
GRNPaymentSchema.index({ grn_id: 1, createdAt: -1 });
GRNPaymentSchema.index({ supplier_id: 1, createdAt: -1 });

export default mongoose.model<IGRNPayment>("GRNPayment", GRNPaymentSchema);
