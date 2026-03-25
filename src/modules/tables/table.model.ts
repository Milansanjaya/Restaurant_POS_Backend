import mongoose, { Schema, Document } from "mongoose";

export interface ITable extends Document {
  tableNumber: string;
  branch_id: string;
  capacity: number;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "CLEANING";
  currentSale?: mongoose.Types.ObjectId;
  section?: string;
  isActive: boolean;
}

const TableSchema = new Schema<ITable>(
  {
    tableNumber: {
      type: String,
      required: true
    },
    branch_id: {
      type: String,
      required: true
    },
    capacity: {
      type: Number,
      default: 2
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING"],
      default: "AVAILABLE"
    },
    currentSale: {
      type: Schema.Types.ObjectId,
      ref: "Sale"
    },
    section: String,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

TableSchema.index(
  { tableNumber: 1, branch_id: 1 },
  { unique: true }
);

export default mongoose.model<ITable>("Table", TableSchema);