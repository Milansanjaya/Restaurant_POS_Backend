import mongoose, { Schema, Document } from "mongoose";

export interface IKitchenOrder extends Document {
  sale: mongoose.Types.ObjectId;
  branch_id: string;
  items: {
    product: mongoose.Types.ObjectId;
    name: string;
    quantity: number;
  }[];
  status: "PENDING" | "PREPARING" | "READY" | "SERVED";
  createdBy: mongoose.Types.ObjectId;
}

const KitchenOrderSchema = new Schema<IKitchenOrder>(
  {
    sale: { type: Schema.Types.ObjectId, ref: "Sale" },
    branch_id: { type: String, required: true },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product" },
        name: String,
        quantity: Number
      }
    ],
    status: {
      type: String,
      enum: ["PENDING", "PREPARING", "READY", "SERVED"],
      default: "PENDING"
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export default mongoose.model<IKitchenOrder>(
  "KitchenOrder",
  KitchenOrderSchema
);