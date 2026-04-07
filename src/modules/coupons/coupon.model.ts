import mongoose, { Schema, Document } from "mongoose";

export interface ICoupon extends Document {
  code: string;
  discountType: "FLAT" | "PERCENTAGE";
  value: number;
  expiryDate: Date;
  isActive: boolean;

  // Optional fields (supported by clients / Postman collection)
  minOrderValue?: number;
  maxDiscount?: number;
  validFrom?: Date;
  validTo?: Date;
  usageLimit?: number;
  timesUsed?: number;
}

const CouponSchema = new Schema<ICoupon>({
  code: { type: String, unique: true, required: true, trim: true },
  discountType: {
    type: String,
    enum: ["FLAT", "PERCENTAGE"],
    required: true
  },
  value: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },

  minOrderValue: { type: Number, default: 0 },
  maxDiscount: { type: Number },
  validFrom: { type: Date },
  validTo: { type: Date },
  usageLimit: { type: Number },
  timesUsed: { type: Number, default: 0 }
});

export default mongoose.model<ICoupon>("Coupon", CouponSchema);