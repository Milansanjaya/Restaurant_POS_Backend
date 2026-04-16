import mongoose, { Schema, Document } from "mongoose";

export interface IOrderReturnItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  price: number;        // sale price per unit
  costPrice: number;    // COGS per unit at time of return
  refundAmount: number; // price × quantity  (revenue reversed)
  costAmount: number;   // costPrice × quantity  (COGS impact)
  reason: string;
}

export interface IOrderReturn extends Document {
  returnNumber: string;
  sale_id: mongoose.Types.ObjectId;
  invoiceNumber: string;
  branch_id: string;
  returnType: 'INTERNAL' | 'CUSTOMER';
  items: IOrderReturnItem[];
  refundAmount: number;    // total revenue reversed
  totalCostAmount: number; // total COGS at stake
  /**
   * netPnlImpact (always ≤ 0):
   *   CUSTOMER → -(refundAmount − totalCostAmount) = -(original gross profit lost)
   *              COGS is recovered via stock restoration
   *   INTERNAL → -(totalCostAmount)
   *              pure wastage write-off, no refund issued
   */
  netPnlImpact: number;
  status: 'COMPLETED';
  notes?: string;
  imageUrl?: string;
  processedBy: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const OrderReturnSchema = new Schema<IOrderReturn>(
  {
    returnNumber:    { type: String, required: true, unique: true },
    sale_id:         { type: Schema.Types.ObjectId, ref: "Sale", required: true },
    invoiceNumber:   { type: String, required: true },
    branch_id:       { type: String, required: true },
    returnType: {
      type: String,
      enum: ['INTERNAL', 'CUSTOMER'],
      required: true,
    },
    items: [
      {
        product:      { type: Schema.Types.ObjectId, ref: "Product", required: true },
        productName:  { type: String, required: true },
        quantity:     { type: Number, required: true },
        price:        { type: Number, required: true },
        costPrice:    { type: Number, required: true, default: 0 },
        refundAmount: { type: Number, required: true },
        costAmount:   { type: Number, required: true, default: 0 },
        reason:       { type: String, required: true },
      },
    ],
    refundAmount:    { type: Number, required: true },
    totalCostAmount: { type: Number, required: true, default: 0 },
    netPnlImpact:    { type: Number, required: true, default: 0 },
    status:          { type: String, enum: ['COMPLETED'], default: 'COMPLETED' },
    notes:           { type: String },
    imageUrl:        { type: String },
    processedBy:     { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

OrderReturnSchema.index({ branch_id: 1, createdAt: -1 });
OrderReturnSchema.index({ sale_id: 1 });
OrderReturnSchema.index({ returnNumber: 1 });

export default mongoose.model<IOrderReturn>("OrderReturn", OrderReturnSchema);
