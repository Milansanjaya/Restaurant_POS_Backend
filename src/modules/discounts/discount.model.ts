import mongoose, { Schema, Document } from 'mongoose';

export interface IDiscount extends Document {
  name: string;
  discountType: 'FLAT' | 'PERCENTAGE';
  value: number;
  isActive: boolean;
  validFrom?: Date;
  validTo?: Date;
  branch_id: string;
  createdBy?: mongoose.Types.ObjectId;
}

const DiscountSchema = new Schema<IDiscount>(
  {
    name: { type: String, required: true, trim: true },
    discountType: {
      type: String,
      enum: ['FLAT', 'PERCENTAGE'],
      required: true,
    },
    value: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    validFrom: { type: Date },
    validTo: { type: Date },
    branch_id: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model<IDiscount>('Discount', DiscountSchema);
