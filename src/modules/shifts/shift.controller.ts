import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import Shift from "./shift.model";
import Sale from "../sales/sale.model";
import { autoCloseOpenShiftForCashierIfDue } from "../../shared/shiftAutoClose";

const get2359Cutoff = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 0, 0);

// Get current open shift for the logged-in user
export const getCurrentShift = async (req: AuthRequest, res: Response) => {
  try {
    const branch_id = req.user?.branch_id;
    const cashierId = req.user?._id;

    if (!branch_id || !cashierId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { shift: currentShift } = await autoCloseOpenShiftForCashierIfDue({
      branch_id,
      cashierId: cashierId.toString(),
      now: new Date(),
    });

    const shift = currentShift
      ? await Shift.findById(currentShift._id).populate("cashier", "name email")
      : null;

    res.json({
      shift: shift || null
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get all shifts (with pagination and filters)
export const getShifts = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20)
    );
    const skip = (page - 1) * limit;

    const query: any = { branch_id: req.user?.branch_id };
    
    if (req.query.status) {
      query.status = String(req.query.status);
    }

    const [total, shifts] = await Promise.all([
      Shift.countDocuments(query),
      Shift.find(query)
        .sort({ openedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("cashier", "name email")
    ]);

    res.json({
      page,
      limit,
      total,
      shifts
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get shift by ID
export const getShiftById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const shift = await Shift.findOne({
      _id: id,
      branch_id: req.user?.branch_id
    }).populate("cashier", "name email");

    if (!shift) {
      return res.status(404).json({ message: "Shift not found" });
    }

    res.json({ shift });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

export const openShift = async (req: AuthRequest, res: Response) => {
  try {
    const { openingCash } = req.body;

    if (openingCash === undefined || openingCash === null) {
      return res.status(400).json({
        message: "openingCash is required"
      });
    }

    const branch_id = req.user?.branch_id;
    const cashierId = req.user?._id;

    if (!branch_id || !cashierId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const existingShift = await Shift.findOne({
      branch_id,
      cashier: cashierId,
      status: "OPEN"
    });

    if (existingShift) {
      const cutoff = get2359Cutoff(new Date(existingShift.openedAt));
      const now = new Date();
      if (now.getTime() >= cutoff.getTime()) {
        await autoCloseOpenShiftForCashierIfDue({
          branch_id,
          cashierId: cashierId.toString(),
          now,
        });
      } else {
        return res.status(400).json({
          message: "Shift already open"
        });
      }
    }

    const shift = await Shift.create({
      branch_id,
      cashier: cashierId,
      openingCash
    });

    res.status(201).json({
      message: "Shift opened successfully",
      shift
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

export const closeShift = async (req: AuthRequest, res: Response) => {
  try {
    const { closingCash } = req.body;

    if (closingCash === undefined || closingCash === null) {
      return res.status(400).json({
        message: "closingCash is required"
      });
    }

    const shift = await Shift.findOne({
      cashier: req.user?._id,
      status: "OPEN"
    });

    if (!shift) {
      return res.status(404).json({
        message: "No open shift found"
      });
    }

    const sales = await Sale.find({
      branch_id: req.user?.branch_id,
      createdBy: req.user?._id,
      status: "COMPLETED",
      paymentMethod: "CASH",
      createdAt: { $gte: shift.openedAt }
    });

    const totalCashSales = sales.reduce(
      (sum, sale) => sum + sale.grandTotal,
      0
    );

    const expectedCash = shift.openingCash + totalCashSales;
    const cashDifference = closingCash - expectedCash;

    shift.closingCash = closingCash;
    shift.expectedCash = expectedCash;
    shift.cashDifference = cashDifference;
    shift.status = "CLOSED";
    shift.closedAt = new Date();

    await shift.save();

    res.json({
      message: "Shift closed successfully",
      shift
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};