import mongoose, { Schema, Document } from "mongoose";

export interface IBatch extends Document {
  batchNumber: string;
  product_id: mongoose.Types.ObjectId;
  branch_id: string;
  quantity: number;
  remainingQuantity: number;
  costPerUnit: number;
  totalCost: number;
  expiryDate: Date;
  manufactureDate?: Date;
  receivedDate: Date;
  supplier_id?: mongoose.Types.ObjectId;
  grn_id?: mongoose.Types.ObjectId;
  status: 'ACTIVE' | 'BLOCKED' | 'EXPIRED' | 'DEPLETED';
  alertStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EXPIRED';
  daysUntilExpiry: number;
  createdBy: mongoose.Types.ObjectId;
}

const BatchSchema = new Schema<IBatch>(
  {
    batchNumber: { type: String, required: true, unique: true },
    product_id: { 
      type: Schema.Types.ObjectId, 
      ref: "Product", 
      required: true 
    },
    branch_id: { type: String, required: true },
    quantity: { type: Number, required: true },
    remainingQuantity: { type: Number, required: true },
    costPerUnit: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    expiryDate: { type: Date, required: true },
    manufactureDate: { type: Date },
    receivedDate: { type: Date, default: Date.now },
    supplier_id: { type: Schema.Types.ObjectId, ref: "Supplier" },
    grn_id: { type: Schema.Types.ObjectId, ref: "GRN" },
    status: { 
      type: String, 
      enum: ['ACTIVE', 'BLOCKED', 'EXPIRED', 'DEPLETED'], 
      default: 'ACTIVE' 
    },
    alertStatus: { 
      type: String, 
      enum: ['NORMAL', 'WARNING', 'CRITICAL', 'EXPIRED'], 
      default: 'NORMAL' 
    },
    daysUntilExpiry: { type: Number },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

// Indexes for fast queries
BatchSchema.index({ branch_id: 1, status: 1 });
BatchSchema.index({ product_id: 1, expiryDate: 1 });
BatchSchema.index({ batchNumber: 1 });
BatchSchema.index({ expiryDate: 1 });
BatchSchema.index({ alertStatus: 1 });

// Calculate days until expiry before saving
BatchSchema.pre('save', function(next) {
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  this.daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Update alert status based on days until expiry
  if (this.daysUntilExpiry < 0) {
    this.alertStatus = 'EXPIRED';
    this.status = 'EXPIRED';
  } else if (this.daysUntilExpiry <= 7) {
    this.alertStatus = 'CRITICAL';
  } else if (this.daysUntilExpiry <= 30) {
    this.alertStatus = 'WARNING';
  } else {
    this.alertStatus = 'NORMAL';
  }
  
  // Update status if depleted
  if (this.remainingQuantity <= 0) {
    this.status = 'DEPLETED';
  }
  
  next();
});

export default mongoose.model<IBatch>("Batch", BatchSchema);
