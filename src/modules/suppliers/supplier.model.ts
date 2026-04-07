import mongoose, { Schema, Document } from "mongoose";

export interface ISupplier extends Document {
  name: string;
  code: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  creditLimit: number;
  paymentTerms: string;
  gstNumber?: string;
  panNumber?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  branch_id: string;
  outstandingBalance: number;
  createdBy: mongoose.Types.ObjectId;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    address: { type: String },
    creditLimit: { type: Number, default: 0 },
    paymentTerms: { type: String, default: "Net 30" },
    gstNumber: { type: String },
    panNumber: { type: String },
    status: { 
      type: String, 
      enum: ['ACTIVE', 'INACTIVE', 'BLOCKED'], 
      default: 'ACTIVE' 
    },
    branch_id: { type: String, required: true },
    outstandingBalance: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

SupplierSchema.index({ branch_id: 1, status: 1 });
SupplierSchema.index({ code: 1 });

export default mongoose.model<ISupplier>("Supplier", SupplierSchema);
