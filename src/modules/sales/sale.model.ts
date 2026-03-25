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

  // 🔥 Payments
  payments: {
    amount: number;
    paymentMethod: string;
    paidAt?: Date;
    receivedBy?: mongoose.Types.ObjectId;
  }[];

  paidAmount: number;
  balanceAmount: number;

  paymentMethod?: string; // final method (optional summary)

  // 🔥 Updated statuses
  status: "OPEN" | "PARTIALLY_PAID" | "COMPLETED" | "VOIDED";

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
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
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

    // 🔥 Multiple payments support
    payments: [
      {
        amount: { type: Number, required: true },
        paymentMethod: { type: String, required: true },
        paidAt: { type: Date, default: Date.now },
        receivedBy: {
          type: Schema.Types.ObjectId,
          ref: "User"
        }
      }
    ],

    paidAmount: { type: Number, default: 0 },

    balanceAmount: { type: Number, default: 0 },

    // optional summary (last payment method)
    paymentMethod: { type: String },

    status: {
      type: String,
      enum: ["OPEN", "PARTIALLY_PAID", "COMPLETED", "VOIDED"],
      default: "OPEN"
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

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