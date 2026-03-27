import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import Shift from "./shift.model";
import Sale from "../sales/sale.model";

export const openShift = async (req: AuthRequest, res: Response) => {
  try {
    const { openingCash } = req.body;

    if (openingCash === undefined || openingCash === null) {
      return res.status(400).json({
        message: "openingCash is required"
      });
    }

    const existingShift = await Shift.findOne({
      cashier: req.user?._id,
      status: "OPEN"
    });

    if (existingShift) {
      return res.status(400).json({
        message: "Shift already open"
      });
    }

    const shift = await Shift.create({
      branch_id: req.user?.branch_id,
      cashier: req.user?._id,
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