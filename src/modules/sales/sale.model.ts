import mongoose, { Schema, Document } from "mongoose";

export interface ISale extends Document {
  invoiceNumber: string;
  branch_id: string;
  customer_id?: mongoose.Types.ObjectId;  // Optional customer for loyalty tracking
  orderType?: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  table?: mongoose.Types.ObjectId;

  items: {
    product: mongoose.Types.ObjectId;
    quantity: number;
    price: number;           // effective (discounted) unit price
    originalPrice?: number;  // original price before product discount
    cost?: number;
    taxRate: number;
    subtotal: number;
    batch_id?: mongoose.Types.ObjectId;
    batchNumber?: string;
  }[];

  subtotal: number;          // sum of item subtotals at effective (discounted) prices
  productDiscount: number;   // total product-level discount (originalPrice - price) * qty
  taxTotal: number;
  discount: number;          // manual / coupon discount
  serviceCharge: number;
  packagingCharge: number;
  grandTotal: number;

  payments: {
    amount: number;
    paymentMethod: string;
    paidAt?: Date;
    receivedBy?: mongoose.Types.ObjectId;
  }[];

  refunds?: {
  amount: number;
  reason: string;
  items?: {
    product: mongoose.Types.ObjectId;
    quantity: number;
  }[];
  refundedAt: Date;
  refundedBy: mongoose.Types.ObjectId;
}[];

  paidAmount: number;
  balanceAmount: number;

  paymentMethod?: string;

  status: "OPEN" | "PARTIALLY_PAID" | "COMPLETED" | "VOIDED";

  discountType?: "FLAT" | "PERCENTAGE";
  discountValue?: number;
  couponCode?: string;

  reservation?: mongoose.Types.ObjectId;

  createdBy: mongoose.Types.ObjectId;

  voidedBy?: mongoose.Types.ObjectId;
  voidedAt?: Date;
  voidReason?: string;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

const SaleSchema = new Schema<ISale>(
  {
    invoiceNumber: { type: String, required: true, unique: true },

    branch_id: { type: String, required: true },

    customer_id: { type: Schema.Types.ObjectId, ref: "Customer" },  // Optional customer for loyalty

    orderType: {
      type: String,
      enum: ["DINE_IN", "TAKEAWAY", "DELIVERY"],
      default: "TAKEAWAY"
    },

    table: {
      type: Schema.Types.ObjectId,
      ref: "Table"
    },

    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },          // effective price
        originalPrice: { type: Number },                   // pre-discount price
        cost: { type: Number, default: 0 },
        taxRate: { type: Number, required: true },
        subtotal: { type: Number, required: true },
        batch_id: { type: Schema.Types.ObjectId, ref: "Batch" },
        batchNumber: { type: String }
      }
    ],

    subtotal: { type: Number, required: true },
    productDiscount: { type: Number, default: 0 },  // total product-level discount
    taxTotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },           // manual/coupon discount
    serviceCharge: { type: Number, default: 0 },
    packagingCharge: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },

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

    paymentMethod: { type: String },

    status: {
      type: String,
      enum: ["OPEN", "PARTIALLY_PAID", "COMPLETED", "VOIDED"],
      default: "OPEN"
    },

    discountType: {
      type: String,
      enum: ["FLAT", "PERCENTAGE"]
    },

    discountValue: {
      type: Number,
      default: 0
    },

    couponCode: {
      type: String
    },

    reservation: {
      type: Schema.Types.ObjectId,
      ref: "Reservation"
    },
refunds: [
  {
    amount: Number,
    reason: String,
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product"
        },
        quantity: Number
      }
    ],
    refundedAt: {
      type: Date,
      default: Date.now
    },
    refundedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }
  }
],
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
