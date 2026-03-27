import mongoose, { Schema, Document } from "mongoose";

export interface IReservation extends Document {
  branch_id: string;
  table: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  guestCount: number;
  reservationDateTime: Date;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "SEATED"
    | "CANCELLED"
    | "COMPLETED"
    | "NO_SHOW";
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
}

const ReservationSchema = new Schema<IReservation>(
  {
    branch_id: { type: String, required: true },
    table: {
      type: Schema.Types.ObjectId,
      ref: "Table",
      required: true
    },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    guestCount: { type: Number, required: true, default: 1 },
    reservationDateTime: { type: Date, required: true },
    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "SEATED",
        "CANCELLED",
        "COMPLETED",
        "NO_SHOW"
      ],
      default: "PENDING"
    },
    notes: { type: String },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model<IReservation>(
  "Reservation",
  ReservationSchema
);