import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import KitchenOrder from "./kitchen.model";
import Table from "../tables/table.model";
import { getIO } from "../../infrastructure/socket";

export const getKitchenQueue = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;

    const query: any = {
      branch_id: req.user?.branch_id,
      status: { $ne: "SERVED" }
    };

    if (status) {
      query.status = status;
    }

    const orders = await KitchenOrder.find(query)
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

    // Postman sometimes sends sale_id here; support both kitchenOrderId and saleId.
    let order = await KitchenOrder.findOne({
      _id: id,
      branch_id: req.user?.branch_id
    });

    if (!order) {
      order = await KitchenOrder.findOne({
        sale: id,
        branch_id: req.user?.branch_id
      });
    }

    if (!order) {
      return res.status(404).json({
        message: "Kitchen order not found"
      });
    }

    order.status = status as any;
    await order.save();

    getIO().to(`branch:${order.branch_id}`).emit("kitchen:status-updated", order);

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

export const getKitchenDashboard = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const branchId = req.user?.branch_id;
    
    // Debug logging
    console.log("🍳 Kitchen Dashboard Request");
    console.log("👤 User:", req.user?.name, req.user?.email);
    console.log("🏢 User Branch ID:", branchId);
    console.log("👮 User Role:", req.user?.role?.name);

    const [pendingCount, preparingCount, readyCount, orders, allOrders] =
      await Promise.all([
        KitchenOrder.countDocuments({
          branch_id: branchId,
          status: "PENDING"
        }),
        KitchenOrder.countDocuments({
          branch_id: branchId,
          status: "PREPARING"
        }),
        KitchenOrder.countDocuments({
          branch_id: branchId,
          status: "READY"
        }),
        KitchenOrder.find({
          branch_id: branchId,
          status: { $in: ["PENDING", "PREPARING", "READY"] }
        })
          .sort({ createdAt: 1 })
          .populate("sale"),
        // Debug: Get all orders to check branch_ids
        KitchenOrder.find({ status: { $in: ["PENDING", "PREPARING", "READY"] } })
          .select("branch_id status")
          .limit(5)
      ]);
    
    // Debug: Show what branch_ids exist in orders
    const branchIds = [...new Set(allOrders.map((o: any) => o.branch_id))];
    console.log("📋 Orders found for this branch:", orders.length);
    console.log("🌐 All branch_ids in kitchen orders:", branchIds);
    console.log("❓ Branch match?", branchIds.includes(branchId));

    const enrichedOrders = [];

    for (const order of orders as any[]) {
      const table = await Table.findOne({
        currentSale: order.sale?._id,
        branch_id: branchId,
        isActive: true
      });

      const waitingMinutes = Math.floor(
        (Date.now() - new Date(order.createdAt).getTime()) / 60000
      );

      enrichedOrders.push({
        _id: order._id,
        sale: order.sale?._id,
        tableNumber: table?.tableNumber || null,
        section: table?.section || null,
        items: order.items,
        status: order.status,
        createdAt: order.createdAt,
        waitingMinutes
      });
    }

    res.json({
      branch_id: branchId,
      summary: {
        pendingCount,
        preparingCount,
        readyCount,
        totalActive: pendingCount + preparingCount + readyCount
      },
      orders: enrichedOrders
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

// Debug endpoint to check kitchen orders and branch IDs
export const debugKitchen = async (req: AuthRequest, res: Response) => {
  try {
    const userBranchId = req.user?.branch_id;
    
    // Get all kitchen orders
    const allOrders = await KitchenOrder.find({
      status: { $in: ["PENDING", "PREPARING", "READY"] }
    }).select("branch_id status createdAt").limit(20);
    
    // Get unique branch IDs
    const branchIds = [...new Set(allOrders.map(o => o.branch_id))];
    
    // Get orders for this user's branch
    const userOrders = await KitchenOrder.countDocuments({
      branch_id: userBranchId,
      status: { $in: ["PENDING", "PREPARING", "READY"] }
    });
    
    res.json({
      currentUser: {
        name: req.user?.name,
        email: req.user?.email,
        branch_id: userBranchId,
        role: req.user?.role?.name
      },
      kitchenData: {
        totalActiveOrders: allOrders.length,
        ordersForUserBranch: userOrders,
        allBranchIdsInOrders: branchIds,
        branchMatch: branchIds.includes(userBranchId)
      },
      sampleOrders: allOrders.slice(0, 5).map(o => ({
        branch_id: o.branch_id,
        status: o.status
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};