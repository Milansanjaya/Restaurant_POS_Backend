import mongoose, { Schema, Document } from "mongoose";

export interface ISale extends Document {
  invoiceNumber: string;
  branch_id: string;

  items: {
    product: mongoose.Types.ObjectId;
    quantity: number;
    price: number;
    taxRate: number;
    subtotal: number;
  }[];

  subtotal: number;
  taxTotal: number;
  discount: number;
  grandTotal: number;

  paymentMethod: string;

  status: "COMPLETED" | "VOIDED";   // 🔥 Strong typing

  createdBy: mongoose.Types.ObjectId;

  voidedBy?: mongoose.Types.ObjectId;
  voidedAt?: Date;
  voidReason?: string;
}

const SaleSchema = new Schema<ISale>(
  {
    invoiceNumber: { type: String, required: true, unique: true },

    branch_id: { type: String, required: true },

    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        taxRate: { type: Number, required: true },
        subtotal: { type: Number, required: true }
      }
    ],

    subtotal: { type: Number, required: true },
    taxTotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },

    paymentMethod: { type: String, required: true },

    status: {
      type: String,
      enum: ["COMPLETED", "VOIDED"],
      default: "COMPLETED"
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // 🔥 Void tracking fields
    voidedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },

    voidedAt: Date,

    voidReason: String
  },
  { timestamps: true }
);

export default mongoose.model<ISale>("Sale", SaleSchema);