import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import KitchenOrder from "./kitchen.model";
import { getIO } from "../../infrastructure/socket";

export const getKitchenQueue = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await KitchenOrder.find({
      branch_id: req.user?.branch_id,
      status: { $ne: "SERVED" }
    })
      .sort({ createdAt: 1 })
      .populate("sale");

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

export const updateKitchenStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status) {
      return res.status(400).json({
        message: "Status is required"
      });
    }

    const validStatuses = ["PENDING", "PREPARING", "READY", "SERVED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status"
      });
    }

    const order = await KitchenOrder.findById(id);

    if (!order) {
      return res.status(404).json({
        message: "Kitchen order not found"
      });
    }

    order.status = status as any;
    await order.save();

    getIO().emit("kitchen:status-updated", order);
    getIO().to(`branch:${order.branch_id}`).emit(
  "kitchen:status-updated",
  order
);

    res.json({
      message: "Kitchen status updated",
      order
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};