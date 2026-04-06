import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import Sale from "../sales/sale.model";
import Product from "../products/product.model";
import Shift from "../shifts/shift.model";
import KitchenOrder from "../kitchen/kitchen.model";
import Inventory from "../inventory/inventory.model";

export const getDashboardSummary = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const branchId = req.user?.branch_id;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Today's completed sales
    const todaySales = await Sale.find({
      branch_id: branchId,
      status: "COMPLETED",
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const todayRevenue = todaySales.reduce(
      (sum, sale) => sum + sale.grandTotal,
      0
    );

    const todayOrders = todaySales.length;

    // Low stock products
  const lowStockItems = await Inventory.find({
  branch_id: branchId,
  isActive: true,
  $expr: { $lte: ["$stockQuantity", "$lowStockThreshold"] }
});

const lowStockCount = lowStockItems.length;

    // Open shifts
    const openShiftCount = await Shift.countDocuments({
      branch_id: branchId,
      status: "OPEN"
    });

    // Pending kitchen orders
    const pendingKitchenOrders = await KitchenOrder.countDocuments({
      branch_id: branchId,
      status: { $in: ["PENDING", "PREPARING"] }
    });

    res.json({
      branch_id: branchId,
      date: startOfDay.toISOString().split("T")[0],
      todayRevenue,
      todayOrders,
      lowStockCount,
      openShiftCount,
      pendingKitchenOrders
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};
export const getRevenueChart = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const branchId = req.user?.branch_id;

    let { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };

    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      end = new Date();
      end.setHours(23, 59, 59, 999);

      start = new Date();
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    }

    const sales = await Sale.aggregate([
      {
        $match: {
          branch_id: branchId,
          status: "COMPLETED",
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          revenue: { $sum: "$grandTotal" }
        }
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
          "_id.day": 1
        }
      }
    ]);

    const salesMap = new Map<string, number>();

    for (const item of sales) {
      const y = item._id.year;
      const m = String(item._id.month).padStart(2, "0");
      const d = String(item._id.day).padStart(2, "0");
      const key = `${y}-${m}-${d}`;
      salesMap.set(key, item.revenue);
    }

    const points = [];
    const current = new Date(start);

    while (current <= end) {
      const key = current.toISOString().split("T")[0];
      points.push({
        date: key,
        revenue: salesMap.get(key) || 0
      });
      current.setDate(current.getDate() + 1);
    }

    res.json({
      branch_id: branchId,
      points
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};
export const getTopProductsChart = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const branchId = req.user?.branch_id;
    const limit = Number(req.query.limit || 5);

    const result = await Sale.aggregate([
      {
        $match: {
          branch_id: branchId,
          status: "COMPLETED"
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          quantitySold: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.subtotal" }
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $match: {
          "product.isActive": true  // ✅ Filter out deleted products
        }
      },
      {
        $project: {
          _id: 0,
          productId: "$product._id",
          name: "$product.name",
          quantitySold: 1,
          revenue: 1
        }
      },
      { $sort: { quantitySold: -1 } },
      { $limit: limit }
    ]);

    res.json({
      branch_id: branchId,
      topProducts: result
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};
export const getShiftSummary = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const branchId = req.user?.branch_id;

    const shifts = await Shift.find({
      branch_id: branchId
    })
      .populate("cashier", "name email")
      .sort({ createdAt: -1 })
      .limit(20);

    const formatted = shifts.map((shift: any) => ({
      cashier: shift.cashier?.name || "Unknown",
      status: shift.status,
      openingCash: shift.openingCash,
      closingCash: shift.closingCash,
      expectedCash: shift.expectedCash,
      cashDifference: shift.cashDifference,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt
    }));

    res.json({
      branch_id: branchId,
      shifts: formatted
    });

  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};