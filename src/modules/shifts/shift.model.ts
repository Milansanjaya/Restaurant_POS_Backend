import mongoose, { Schema, Document } from "mongoose";

export interface IShift extends Document {
  branch_id: string;
  cashier: mongoose.Types.ObjectId;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  cashDifference?: number;
  status: "OPEN" | "CLOSED";
  openedAt: Date;
  closedAt?: Date;
}

const ShiftSchema = new Schema<IShift>(
  {
    branch_id: { type: String, required: true },
    cashier: { type: Schema.Types.ObjectId, ref: "User", required: true },
    openingCash: { type: Number, required: true },
    closingCash: Number,
    expectedCash: Number,
    cashDifference: Number,
    status: {
      type: String,
      enum: ["OPEN", "CLOSED"],
      default: "OPEN"
    },
    openedAt: { type: Date, default: Date.now },
    closedAt: Date
  },
  { timestamps: true }
);

export default mongoose.model<IShift>("Shift", ShiftSchema);