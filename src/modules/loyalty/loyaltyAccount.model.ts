import mongoose, { Schema, Document } from "mongoose";

export interface ILoyaltyAccount extends Document {
  customer_id: mongoose.Types.ObjectId;
  pointsBalance: number;
  walletBalance: number;
  lifetimePoints: number;
  redeemedPoints: number;
  tier: 'BASIC' | 'SILVER' | 'GOLD' | 'PLATINUM';
  pointsExpiryDate?: Date;
}

const LoyaltyAccountSchema = new Schema<ILoyaltyAccount>(
  {
    customer_id: { 
      type: Schema.Types.ObjectId, 
      ref: "Customer", 
      required: true,
      unique: true
    },
    pointsBalance: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    lifetimePoints: { type: Number, default: 0 },
    redeemedPoints: { type: Number, default: 0 },
    tier: { 
      type: String, 
      enum: ['BASIC', 'SILVER', 'GOLD', 'PLATINUM'], 
      default: 'BASIC' 
    },
    pointsExpiryDate: { type: Date }
  },
  { timestamps: true }
);

LoyaltyAccountSchema.index({ customer_id: 1 });

export default mongoose.model<ILoyaltyAccount>("LoyaltyAccount", LoyaltyAccountSchema);
