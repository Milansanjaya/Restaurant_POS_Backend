import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
  name: string;
  description?: string;
  parentId?: mongoose.Types.ObjectId;
  level: number;
  icon?: string;
  image?: string;
  displayOrder: number;
  isActive: boolean;
  branch_id: string;
  createdBy: mongoose.Types.ObjectId;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    description: { type: String },
    parentId: { type: Schema.Types.ObjectId, ref: "Category" },
    level: { type: Number, default: 0 },
    icon: { type: String },
    image: { type: String },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    branch_id: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

CategorySchema.index({ branch_id: 1, isActive: 1 });
CategorySchema.index({ parentId: 1 });

export default mongoose.model<ICategory>("Category", CategorySchema);
