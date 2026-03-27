import mongoose, { Schema, Document } from "mongoose";

export interface ICoupon extends Document {
  code: string;
  discountType: "FLAT" | "PERCENTAGE";
  value: number;
  expiryDate: Date;
  isActive: boolean;
}

const CouponSchema = new Schema<ICoupon>({
  code: { type: String, unique: true, required: true },
  discountType: {
    type: String,
    enum: ["FLAT", "PERCENTAGE"],
    required: true
  },
  value: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true }
});

export default mongoose.model<ICoupon>("Coupon", CouponSchema);