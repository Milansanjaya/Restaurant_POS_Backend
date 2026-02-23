import mongoose, { Schema, Document, Types } from "mongoose";

export interface IRole extends Document {
  name: string;
  permissions: Types.ObjectId[];
}

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true },
    permissions: [{ type: Schema.Types.ObjectId, ref: "Permission" }]
  },
  { timestamps: true }
);

export default mongoose.model<IRole>("Role", RoleSchema);