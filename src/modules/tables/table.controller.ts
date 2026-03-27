import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import Table from "./table.model";
import Sale from "../sales/sale.model";

export const createTable = async (req: AuthRequest, res: Response) => {
  try {
    const { tableNumber, capacity, section } = req.body;

    if (!tableNumber) {
      return res.status(400).json({
        message: "tableNumber is required"
      });
    }

    const existing = await Table.findOne({
      tableNumber,
      branch_id: req.user?.branch_id
    });

    if (existing) {
      return res.status(400).json({
        message: "Table already exists"
      });
    }

    const table = await Table.create({
      tableNumber,
      capacity,
      section,
      branch_id: req.user?.branch_id
    });

    res.status(201).json({
      message: "Table created successfully",
      table
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

export const getTables = async (req: AuthRequest, res: Response) => {
  try {
    const tables = await Table.find({
      branch_id: req.user?.branch_id,
      isActive: true
    }).sort({ tableNumber: 1 });

    res.json({
      branch_id: req.user?.branch_id,
      tables
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

export const updateTableStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status"
      });
    }

    const table = await Table.findOne({
      _id: id,
      branch_id: req.user?.branch_id,
      isActive: true
    });

    if (!table) {
      return res.status(404).json({
        message: "Table not found"
      });
    }

    table.status = status as any;
    await table.save();

    res.json({
      message: "Table status updated",
      table
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};
export const closeTable = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;
    const { paymentMethod } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({
        message: "paymentMethod is required"
      });
    }

    const table = await Table.findOne({
      _id: tableId,
      branch_id: req.user?.branch_id,
      isActive: true
    });

    if (!table || !table.currentSale) {
      return res.status(404).json({
        message: "No active sale for this table"
      });
    }

    const sale = await Sale.findById(table.currentSale);

    if (!sale) {
      return res.status(404).json({
        message: "Sale not found"
      });
    }

    if (sale.status !== "OPEN") {
      return res.status(400).json({
        message: "Sale is not open"
      });
    }

    sale.status = "COMPLETED";
    sale.paymentMethod = paymentMethod;
    await sale.save();

    table.status = "AVAILABLE";
    table.currentSale = undefined;
    await table.save();

    res.json({
      message: "Table closed successfully",
      sale
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};