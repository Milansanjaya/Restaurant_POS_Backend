import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import KitchenOrder from "./kitchen.model";

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
    const { status } = req.body;

    const order = await KitchenOrder.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Kitchen order not found" });
    }

    order.status = status;
    await order.save();

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