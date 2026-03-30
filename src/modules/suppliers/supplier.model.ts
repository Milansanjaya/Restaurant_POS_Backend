import mongoose, { Schema, Document } from "mongoose";

export interface ISupplier extends Document {
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  creditLimit: number;
  paymentTerms: number; // days
  gstNumber: string;
  panNumber: string;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  branch_id: string;
  outstandingBalance: number;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    creditLimit: { type: Number, required: true },
    paymentTerms: { type: Number, default: 30 },
    gstNumber: { type: String, required: true },
    panNumber: { type: String, required: true },
    status: { type: String, enum: ["ACTIVE", "INACTIVE", "BLOCKED"], default: "ACTIVE" },
    branch_id: { type: String, required: true },
    outstandingBalance: { type: Number, default: 0 }
  },
  { timestamps: true }
);

SupplierSchema.index({ branch_id: 1, code: 1 });
SupplierSchema.index({ branch_id: 1, status: 1 });

export default mongoose.model<ISupplier>("Supplier", SupplierSchema);
