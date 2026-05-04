import mongoose, { Schema, Document } from "mongoose";

export interface IDailyReceiptCounter extends Document {
  branch_id: string;
  day: string; // YYYY-MM-DD (server local date)
  seq: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const DailyReceiptCounterSchema = new Schema<IDailyReceiptCounter>(
  {
    branch_id: { type: String, required: true },
    day: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

DailyReceiptCounterSchema.index({ branch_id: 1, day: 1 }, { unique: true });

export default mongoose.model<IDailyReceiptCounter>(
  "DailyReceiptCounter",
  DailyReceiptCounterSchema
);
