import mongoose, { Schema, Document } from "mongoose";

export interface ICustomer extends Document {
  customerCode: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  dob?: Date;
  anniversary?: Date;
  isWalkIn: boolean;
  tier: 'BASIC' | 'SILVER' | 'GOLD' | 'PLATINUM';
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastVisit?: Date;
  status: 'ACTIVE' | 'INACTIVE';
  branch_id?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    customerCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String },
    address: { type: String },
    dob: { type: Date },
    anniversary: { type: Date },
    isWalkIn: { type: Boolean, default: false },
    tier: { 
      type: String, 
      enum: ['BASIC', 'SILVER', 'GOLD', 'PLATINUM'], 
      default: 'BASIC' 
    },
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    lastVisit: { type: Date },
    status: { 
      type: String, 
      enum: ['ACTIVE', 'INACTIVE'], 
      default: 'ACTIVE' 
    },
    branch_id: { type: String },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

CustomerSchema.index({ phone: 1 });
CustomerSchema.index({ customerCode: 1 });
CustomerSchema.index({ branch_id: 1 });
CustomerSchema.index({ tier: 1 });

export default mongoose.model<ICustomer>("Customer", CustomerSchema);
