import mongoose, { Schema, Document } from "mongoose";

export interface IOrderReturnItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  price: number;
  refundAmount: number;
  reason: string;
}

export interface IOrderReturn extends Document {
  returnNumber: string;
  sale_id: mongoose.Types.ObjectId;
  invoiceNumber: string;
  branch_id: string;
  returnType: 'INTERNAL' | 'CUSTOMER';
  items: IOrderReturnItem[];
  refundAmount: number;
  status: 'COMPLETED';
  notes?: string;
  imageUrl?: string;
  processedBy: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const OrderReturnSchema = new Schema<IOrderReturn>(
  {
    returnNumber: { type: String, required: true, unique: true },
    sale_id: { type: Schema.Types.ObjectId, ref: "Sale", required: true },
    invoiceNumber: { type: String, required: true },
    branch_id: { type: String, required: true },
    returnType: {
      type: String,
      enum: ['INTERNAL', 'CUSTOMER'],
      required: true,
    },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        refundAmount: { type: Number, required: true },
        reason: { type: String, required: true },
      },
    ],
    refundAmount: { type: Number, required: true },
    status: { type: String, enum: ['COMPLETED'], default: 'COMPLETED' },
    notes: { type: String },
    imageUrl: { type: String },
    processedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

OrderReturnSchema.index({ branch_id: 1, createdAt: -1 });
OrderReturnSchema.index({ sale_id: 1 });
OrderReturnSchema.index({ returnNumber: 1 });

export default mongoose.model<IOrderReturn>("OrderReturn", OrderReturnSchema);
