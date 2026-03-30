import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import Sale from "../sales/sale.model";
import Inventory from "../inventory/inventory.model";

export const getDailySales = async (req: AuthRequest, res: Response) => {
  try {
    const dateStr = req.query.date ? String(req.query.date) : undefined;

    // Default to today if date is missing/invalid
    const base = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(base.getTime())) {
      return res.status(400).json({
        message: "Invalid date. Use ISO format like 2026-03-30"
      });
    }

    const start = new Date(base);
    start.setHours(0, 0, 0, 0);

    const end = new Date(base);
    end.setHours(23, 59, 59, 999);

    const sales = await Sale.find({
      branch_id: req.user?.branch_id,
      status: "COMPLETED",
      createdAt: { $gte: start, $lte: end }
    });

    let totalSales = 0;
    const totalOrders = sales.length;
    let totalTax = 0;

    sales.forEach((s) => {
      totalSales += s.grandTotal;
      totalTax += s.taxTotal;
    });

    res.json({
      date: start.toISOString().slice(0, 10),
      totalOrders,
      totalSales,
      totalTax,
      averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
export const getTopProducts = async (req: AuthRequest, res: Response) => {
  try {
    const sales = await Sale.find({
      branch_id: req.user?.branch_id,
      status: "COMPLETED"
    }).populate("items.product");

    const map: any = {};

    sales.forEach((sale: any) => {
      sale.items.forEach((item: any) => {
        const name = item.product?.name;

        if (!map[name]) map[name] = 0;
        map[name] += item.quantity;
      });
    });

    const sorted = Object.entries(map)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a: any, b: any) => b.qty - a.qty);

    res.json(sorted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
export const getPaymentSummary = async (req: AuthRequest, res: Response) => {
  try {
    const sales = await Sale.find({
      branch_id: req.user?.branch_id,
      status: { $in: ["COMPLETED", "PARTIALLY_PAID"] }
    });

    const summary: any = {};

    sales.forEach((sale: any) => {
      sale.payments?.forEach((p: any) => {
        // payments use paymentMethod in sale.model
        const method = p.paymentMethod || p.method;
        if (!method) return;
        if (!summary[method]) summary[method] = 0;
        summary[method] += p.amount;
      });
    });

    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
export const getLowStock = async (req: AuthRequest, res: Response) => {
  try {
    const items = await Inventory.find({
      branch_id: req.user?.branch_id,
      stockQuantity: { $lte: 5 } // threshold
    }).populate("product");

    res.json(items);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};