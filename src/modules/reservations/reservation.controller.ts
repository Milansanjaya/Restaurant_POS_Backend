import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import Reservation from "./reservation.model";
import Table from "../tables/table.model";

export const createReservation = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const body: any = req.body ?? {};

    const tableId = body.tableId ?? body.table_id;
    const customerName = body.customerName ?? body.customer_name;
    const customerPhone = body.customerPhone ?? body.customer_phone;
    const guestCount = body.guestCount ?? body.partySize ?? body.guest_count;
    const notes = body.notes;

    let reservationDateTime = body.reservationDateTime;
    if (!reservationDateTime && body.reservationDate && body.reservationTime) {
      // Accept payload split into date + time (e.g. "2026-01-21" + "19:00")
      reservationDateTime = new Date(`${body.reservationDate}T${body.reservationTime}:00`);
    }

    if (!tableId || !customerName || !customerPhone || !reservationDateTime) {
      return res.status(400).json({
        message:
          "tableId, customerName, customerPhone, and reservationDateTime are required"
      });
    }

    if (Number.isNaN(new Date(reservationDateTime).getTime())) {
      return res.status(400).json({
        message: "Invalid reservationDateTime"
      });
    }

    const table = await Table.findOne({
      _id: tableId,
      branch_id: req.user?.branch_id,
      isActive: true
    });

    if (!table) {
      return res.status(404).json({
        message: "Table not found"
      });
    }

    const reservation = await Reservation.create({
      branch_id: req.user?.branch_id,
      table: table._id,
      customerName,
      customerPhone,
      guestCount,
      reservationDateTime,
      notes,
      createdBy: req.user?._id
    });

    res.status(201).json({
      message: "Reservation created successfully",
      reservation
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

export const getReservations = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { status, date } = req.query;

    const query: any = {
      branch_id: req.user?.branch_id
    };

    if (status) {
      query.status = status;
    }

    if (date) {
      const start = new Date(date as string);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date as string);
      end.setHours(23, 59, 59, 999);

      query.reservationDateTime = {
        $gte: start,
        $lte: end
      };
    }

    const reservations = await Reservation.find(query)
      .populate("table", "tableNumber section")
      .sort({ reservationDateTime: 1 });

    res.json({
      branch_id: req.user?.branch_id,
      reservations
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

export const updateReservationStatus = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "PENDING",
      "CONFIRMED",
      "SEATED",
      "CANCELLED",
      "COMPLETED",
      "NO_SHOW"
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid reservation status"
      });
    }

    const reservation = await Reservation.findOne({
      _id: id,
      branch_id: req.user?.branch_id
    });

    if (!reservation) {
      return res.status(404).json({
        message: "Reservation not found"
      });
    }

    reservation.status = status as any;
    await reservation.save();

    res.json({
      message: "Reservation status updated successfully",
      reservation
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};
export const seatReservation = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params;

    const reservation = await Reservation.findOne({
      _id: id,
      branch_id: req.user?.branch_id
    }).populate("table");

    if (!reservation) {
      return res.status(404).json({
        message: "Reservation not found"
      });
    }

    if (["CANCELLED", "NO_SHOW", "COMPLETED"].includes(reservation.status)) {
      return res.status(400).json({
        message: `Cannot seat a ${reservation.status.toLowerCase()} reservation`
      });
    }

    if (reservation.status === "SEATED") {
      return res.status(400).json({
        message: "Reservation already seated"
      });
    }

    reservation.status = "SEATED" as any;
    await reservation.save();

    res.json({
      message: "Reservation seated successfully",
      reservation
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};