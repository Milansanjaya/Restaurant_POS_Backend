import mongoose, { Schema, Document } from "mongoose";

export interface IWalletTransaction extends Document {
  customer_id: mongoose.Types.ObjectId;
  type: 'CREDIT' | 'DEBIT' | 'REFUND';
  amount: number;
  balance: number;
  sale_id?: mongoose.Types.ObjectId;
  paymentMethod?: string;
  description?: string;
  createdBy?: mongoose.Types.ObjectId;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    customer_id: { 
      type: Schema.Types.ObjectId, 
      ref: "Customer", 
      required: true 
    },
    type: { 
      type: String, 
      enum: ['CREDIT', 'DEBIT', 'REFUND'], 
      required: true 
    },
    amount: { type: Number, required: true },
    balance: { type: Number, required: true },
    sale_id: { type: Schema.Types.ObjectId, ref: "Sale" },
    paymentMethod: { type: String },
    description: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

WalletTransactionSchema.index({ customer_id: 1, createdAt: -1 });

export default mongoose.model<IWalletTransaction>(
  "WalletTransaction", 
  WalletTransactionSchema
);
