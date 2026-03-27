import mongoose, { Schema, Document } from "mongoose";

export interface IPermission extends Document {
  name: string;
  description: string;
}

const PermissionSchema = new Schema<IPermission>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model<IPermission>("Permission", PermissionSchema);