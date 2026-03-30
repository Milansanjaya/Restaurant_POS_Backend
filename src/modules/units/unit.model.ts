import mongoose, { Schema, Document } from "express";

export interface IUnit extends Document {
  name: string;
  shortCode: string;
  type: 'WEIGHT' | 'VOLUME' | 'COUNT' | 'LENGTH';
  baseUnit?: mongoose.Types.ObjectId;
  conversionFactor?: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const UnitSchema = new Schema<IUnit>(
  {
    name: { type: String, required: true },
    shortCode: { type: String, required: true, unique: true },
    type: { 
      type: String, 
      enum: ['WEIGHT', 'VOLUME', 'COUNT', 'LENGTH'], 
      required: true 
    },
    baseUnit: { type: Schema.Types.ObjectId, ref: "Unit" },
    conversionFactor: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

UnitSchema.index({ shortCode: 1 });
UnitSchema.index({ type: 1 });

export default mongoose.model<IUnit>("Unit", UnitSchema);
