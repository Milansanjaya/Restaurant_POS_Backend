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
        // ✅ Only count active products
        if (!item.product || !item.product.isActive) return;
        
        const name = item.product.name;

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
    // Use dynamic lowStockThreshold per item instead of hardcoded value
    const items = await Inventory.find({
      branch_id: req.user?.branch_id,
      isActive: true,
      $expr: { $lte: ["$stockQuantity", "$lowStockThreshold"] }
    }).populate("product");

    // ✅ Filter out items where product is null OR inactive
    const validItems = items.filter(item => {
      if (!item.product) return false;
      const product = item.product as any;
      return product.isActive === true;
    });

    res.json(validItems);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Profit report grouped by day (uses Sale.items[].cost when available)
export const getProfitReport = async (req: AuthRequest, res: Response) => {
  try {
    const branchId = req.user?.branch_id;
    if (!branchId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const fromStr = req.query.from ? String(req.query.from) : undefined;
    const toStr = req.query.to ? String(req.query.to) : undefined;
    const orderType = req.query.orderType ? String(req.query.orderType) : undefined;

    const baseFrom = fromStr ? new Date(fromStr) : new Date();
    const baseTo = toStr ? new Date(toStr) : new Date(baseFrom);

    if (isNaN(baseFrom.getTime()) || isNaN(baseTo.getTime())) {
      return res.status(400).json({ message: "Invalid from/to date. Use YYYY-MM-DD" });
    }

    const start = new Date(baseFrom);
    start.setHours(0, 0, 0, 0);

    const end = new Date(baseTo);
    end.setHours(23, 59, 59, 999);

    const query: any = {
      branch_id: branchId,
      status: "COMPLETED",
      createdAt: { $gte: start, $lte: end }
    };

    if (orderType) query.orderType = orderType;

    const sales = await Sale.find(query)
      .select("createdAt subtotal discount items")
      .populate("items.product", "cost")
      .lean();

    type Day = {
      date: string;
      totalOrders: number;
      grossSales: number;
      discount: number;
      netSales: number;
      totalCost: number;
      profit: number;
    };

    const daysMap = new Map<string, Day>();

    for (const sale of sales as any[]) {
      const createdAt = sale.createdAt ? new Date(sale.createdAt) : new Date();
      const dateKey = createdAt.toISOString().slice(0, 10);

      const grossSales = Number(sale.subtotal || 0);
      const discountRaw = Number(sale.discount || 0);
      const discountOnSubtotal = Math.min(Math.max(discountRaw, 0), Math.max(grossSales, 0));
      const netSales = grossSales - discountOnSubtotal;

      let totalCost = 0;
      for (const item of sale.items || []) {
        const qty = Number(item.quantity || 0);
        const capturedCost = item.cost;
        const productCost = item.product && typeof item.product === "object" ? Number((item.product as any).cost || 0) : 0;
        const cost = Number.isFinite(Number(capturedCost)) ? Number(capturedCost) : productCost;
        totalCost += Math.max(0, cost) * Math.max(0, qty);
      }

      const profit = netSales - totalCost;

      const existing = daysMap.get(dateKey) || {
        date: dateKey,
        totalOrders: 0,
        grossSales: 0,
        discount: 0,
        netSales: 0,
        totalCost: 0,
        profit: 0
      };

      existing.totalOrders += 1;
      existing.grossSales += grossSales;
      existing.discount += discountOnSubtotal;
      existing.netSales += netSales;
      existing.totalCost += totalCost;
      existing.profit += profit;

      daysMap.set(dateKey, existing);
    }

    const days = Array.from(daysMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const totals = days.reduce(
      (acc, d) => {
        acc.totalOrders += d.totalOrders;
        acc.grossSales += d.grossSales;
        acc.discount += d.discount;
        acc.netSales += d.netSales;
        acc.totalCost += d.totalCost;
        acc.profit += d.profit;
        return acc;
      },
      { totalOrders: 0, grossSales: 0, discount: 0, netSales: 0, totalCost: 0, profit: 0 }
    );

    return res.json({
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
      orderType: orderType || null,
      totals,
      days
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};