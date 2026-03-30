import mongoose, { Schema, Document } from "mongoose";

export interface ILoyaltyTransaction extends Document {
  customer_id: mongoose.Types.ObjectId;
  type: 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'ADJUSTED';
  points: number;
  balance: number;
  sale_id?: mongoose.Types.ObjectId;
  expiryDate?: Date;
  description?: string;
  createdBy?: mongoose.Types.ObjectId;
}

const LoyaltyTransactionSchema = new Schema<ILoyaltyTransaction>(
  {
    customer_id: { 
      type: Schema.Types.ObjectId, 
      ref: "Customer", 
      required: true 
    },
    type: { 
      type: String, 
      enum: ['EARNED', 'REDEEMED', 'EXPIRED', 'ADJUSTED'], 
      required: true 
    },
    points: { type: Number, required: true },
    balance: { type: Number, required: true },
    sale_id: { type: Schema.Types.ObjectId, ref: "Sale" },
    expiryDate: { type: Date },
    description: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

LoyaltyTransactionSchema.index({ customer_id: 1, createdAt: -1 });

export default mongoose.model<ILoyaltyTransaction>(
  "LoyaltyTransaction", 
  LoyaltyTransactionSchema
);
