import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import Sale from "../sales/sale.model";

export const getDailyReport = async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const sales = await Sale.find({
      branch_id: req.user?.branch_id,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const completedSales = sales.filter(s => s.status === "COMPLETED");
    const voidedSales = sales.filter(s => s.status === "VOIDED");

    const totalRevenue = completedSales.reduce(
      (sum, sale) => sum + sale.grandTotal,
      0
    );

    const totalTax = completedSales.reduce(
      (sum, sale) => sum + sale.taxTotal,
      0
    );

    res.json({
      date: startOfDay.toISOString().split("T")[0],
      totalRevenue,
      totalOrders: completedSales.length,
      totalTax,
      voidedOrders: voidedSales.length
    });

  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};
export const getTopSellingProducts = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage: any = {
      branch_id: req.user?.branch_id,
      status: "COMPLETED"
    };

    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const result = await Sale.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalQuantitySold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.subtotal" }
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
        $project: {
          productId: "$_id",
          name: "$product.name",
          totalQuantitySold: 1,
          totalRevenue: 1
        }
      },
      { $sort: { totalQuantitySold: -1 } }
    ]);

    res.json({
      topProducts: result
    });

  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};
export const getPaymentBreakdown = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage: any = {
      branch_id: req.user?.branch_id,
      status: "COMPLETED"
    };

    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const result = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$paymentMethod",
          totalAmount: { $sum: "$grandTotal" },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    const totalRevenue = result.reduce(
      (sum, r) => sum + r.totalAmount,
      0
    );

    const formatted = result.map(r => ({
      paymentMethod: r._id,
      totalAmount: r.totalAmount,
      totalOrders: r.totalOrders
    }));

    res.json({
      totalRevenue,
      breakdown: formatted
    });

  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};