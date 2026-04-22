import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../middleware/auth.middleware";
import LoyaltyAccount from "./loyaltyAccount.model";
import LoyaltyTransaction from "./loyaltyTransaction.model";
import WalletTransaction from "./walletTransaction.model";
import Customer from "../customers/customer.model";
import SystemConfig from "../config/systemConfig.model";

export class LoyaltyController {
  // Get or create loyalty account
  async getLoyaltyAccount(req: AuthRequest, res: Response) {
    try {
      const { customerId } = req.params;
      if (!mongoose.isValidObjectId(customerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer id"
        });
      }

      const customer = await Customer.findById(customerId).select("_id");
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }

      let account = await LoyaltyAccount.findOne({ customer_id: customerId }).populate(
        "customer_id",
        "name phone tier"
      );

      if (!account) {
        account = new LoyaltyAccount({ customer_id: customerId });
        await account.save();
        await account.populate("customer_id", "name phone tier");
      }

      return res.status(200).json({
        success: true,
        data: account
      });
    } catch (error: any) {
      if (error?.name === "CastError") {
        return res.status(400).json({
          success: false,
          message: "Invalid data",
          error: error.message
        });
      }
      return res.status(500).json({
        success: false,
        message: "Error fetching loyalty account",
        error: error.message
      });
    }
  }

  // Earn points (called after sale)
  async earnPoints(req: AuthRequest, res: Response) {
    try {
      const rawCustomerId = (req as any).body?.customerId ?? (req as any).body?.customer_id;
      const customerId = typeof rawCustomerId === "string" ? rawCustomerId : String(rawCustomerId ?? "");
      if (!mongoose.isValidObjectId(customerId)) {
        return res.status(400).json({
          success: false,
          message: "customerId/customer_id is required"
        });
      }

      const customer = await Customer.findById(customerId).select("_id tier");
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }

      const rawSaleAmount =
        (req as any).body?.saleAmount ?? (req as any).body?.orderAmount ?? (req as any).body?.totalAmount;
      const saleAmount = typeof rawSaleAmount === "string" ? Number(rawSaleAmount) : rawSaleAmount;
      if (typeof saleAmount !== "number" || Number.isNaN(saleAmount) || !Number.isFinite(saleAmount)) {
        return res.status(400).json({
          success: false,
          message: "saleAmount must be a valid number"
        });
      }
      if (saleAmount < 0) {
        return res.status(400).json({
          success: false,
          message: "saleAmount cannot be negative"
        });
      }

      const rawSaleId = (req as any).body?.sale_id ?? (req as any).body?.saleId;
      const sale_id = rawSaleId && mongoose.isValidObjectId(rawSaleId) ? rawSaleId : undefined;

      const branch_id = (req as any).body?.branch_id;
      const config = branch_id ? await SystemConfig.findOne({ branch_id }) : null;

      const pointsPerDollar = typeof (config as any)?.pointsPerDollar === "number" ? (config as any).pointsPerDollar : 0.1;
      const pointsExpiryDays = typeof (config as any)?.pointsExpiryDays === "number" ? (config as any).pointsExpiryDays : 365;
      const tier = String((customer as any)?.tier || "BASIC").toUpperCase();
      const multipliers = (config as any)?.pointsMultiplierByTier || {};
      const tierMultiplierRaw = (multipliers as any)?.[tier];
      const tierMultiplier = typeof tierMultiplierRaw === "number" && Number.isFinite(tierMultiplierRaw) ? tierMultiplierRaw : 1;

      // Points calculation: base points per 1 currency unit * tier multiplier
      // Example: 0.1 points/unit and 1000 spent => 100 points (before multiplier)
      const rawPoints = saleAmount * pointsPerDollar * tierMultiplier;
      const pointsEarned = Math.floor(rawPoints);
      if (pointsEarned <= 0) {
        return res.status(200).json({
          success: true,
          message: "No points earned (amount too small)",
          pointsEarned: 0
        });
      }

      let account = await LoyaltyAccount.findOne({ customer_id: customerId });
      if (!account) {
        account = new LoyaltyAccount({ customer_id: customerId });
      }

      // Keep account tier aligned with customer tier
      (account as any).tier = tier;

      account.pointsBalance = (account.pointsBalance ?? 0) + pointsEarned;
      account.lifetimePoints = (account.lifetimePoints ?? 0) + pointsEarned;

      let expiryDate: Date | undefined;
      if (typeof pointsExpiryDays === "number" && pointsExpiryDays > 0) {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + pointsExpiryDays);
        account.pointsExpiryDate = expiryDate;
      } else {
        expiryDate = undefined;
        account.pointsExpiryDate = undefined;
      }

      await account.save();

      const transaction = new LoyaltyTransaction({
        customer_id: customerId,
        type: "EARNED",
        points: pointsEarned,
        balance: account.pointsBalance,
        sale_id,
        expiryDate,
        description: sale_id ? `Earned from sale #${sale_id}` : "Earned points",
        createdBy: req.user?._id
      });
      await transaction.save();

      return res.status(200).json({
        success: true,
        message: "Points earned successfully",
        data: {
          pointsEarned,
          newBalance: account.pointsBalance
        }
      });
    } catch (error: any) {
      if (error?.name === "CastError") {
        return res.status(400).json({
          success: false,
          message: "Invalid data",
          error: error.message
        });
      }
      if (error?.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      return res.status(500).json({
        success: false,
        message: "Error earning points",
        error: error.message
      });
    }
  }

  // Redeem points
  async redeemPoints(req: AuthRequest, res: Response) {
    try {
      const rawCustomerId = (req as any).body?.customerId ?? (req as any).body?.customer_id;
      const customerId = typeof rawCustomerId === "string" ? rawCustomerId : String(rawCustomerId ?? "");
      if (!mongoose.isValidObjectId(customerId)) {
        return res.status(400).json({
          success: false,
          message: "customerId/customer_id is required"
        });
      }

      const rawPoints = (req as any).body?.points;
      const points = typeof rawPoints === "string" ? Number(rawPoints) : rawPoints;
      if (typeof points !== "number" || Number.isNaN(points) || !Number.isFinite(points) || points <= 0) {
        return res.status(400).json({
          success: false,
          message: "points must be a valid number greater than 0"
        });
      }

      const account = await LoyaltyAccount.findOne({ customer_id: customerId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Loyalty account not found"
        });
      }

      if ((account.pointsBalance ?? 0) < points) {
        return res.status(400).json({
          success: false,
          message: "Insufficient points balance",
          availablePoints: account.pointsBalance ?? 0
        });
      }

      const rawSaleId = (req as any).body?.sale_id ?? (req as any).body?.saleId;
      const sale_id = rawSaleId && mongoose.isValidObjectId(rawSaleId) ? rawSaleId : undefined;

      account.pointsBalance = (account.pointsBalance ?? 0) - points;
      account.redeemedPoints = (account.redeemedPoints ?? 0) + points;
      await account.save();

      const transaction = new LoyaltyTransaction({
        customer_id: customerId,
        type: "REDEEMED",
        points: -points,
        balance: account.pointsBalance,
        sale_id,
        description: sale_id ? `Redeemed for sale #${sale_id}` : "Redeemed points",
        createdBy: req.user?._id
      });
      await transaction.save();

      const discountAmount = (points / 100) * 10;

      return res.status(200).json({
        success: true,
        message: "Points redeemed successfully",
        data: {
          pointsRedeemed: points,
          discountAmount,
          newBalance: account.pointsBalance
        }
      });
    } catch (error: any) {
      if (error?.name === "CastError") {
        return res.status(400).json({
          success: false,
          message: "Invalid data",
          error: error.message
        });
      }
      if (error?.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      return res.status(500).json({
        success: false,
        message: "Error redeeming points",
        error: error.message
      });
    }
  }

  // Get points history
  async getPointsHistory(req: AuthRequest, res: Response) {
    try {
      const { customerId } = req.params;
      if (!mongoose.isValidObjectId(customerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer id"
        });
      }
      const { page = 1, limit = 20 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const transactions = await LoyaltyTransaction.find({ customer_id: customerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('sale_id', 'saleNumber totalAmount')
        .populate('createdBy', 'name');

      const total = await LoyaltyTransaction.countDocuments({ customer_id: customerId });

      res.status(200).json({
        success: true,
        data: transactions,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching points history",
        error: error.message
      });
    }
  }

  // Wallet top-up
  async walletTopup(req: AuthRequest, res: Response) {
    try {
      const rawCustomerId = (req as any).body?.customerId ?? (req as any).body?.customer_id;
      const customerId = typeof rawCustomerId === "string" ? rawCustomerId : String(rawCustomerId ?? "");
      if (!mongoose.isValidObjectId(customerId)) {
        return res.status(400).json({
          success: false,
          message: "customerId/customer_id is required"
        });
      }

      const rawAmount = (req as any).body?.amount;
      const amount = typeof rawAmount === "string" ? Number(rawAmount) : rawAmount;
      if (typeof amount !== "number" || Number.isNaN(amount) || !Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "amount must be a valid number greater than 0"
        });
      }

      const paymentMethod = (req as any).body?.paymentMethod;

      let account = await LoyaltyAccount.findOne({ customer_id: customerId });
      if (!account) {
        account = new LoyaltyAccount({ customer_id: customerId });
      }

      account.walletBalance = (account.walletBalance ?? 0) + amount;
      await account.save();

      const transaction = new WalletTransaction({
        customer_id: customerId,
        type: "CREDIT",
        amount,
        balance: account.walletBalance,
        paymentMethod,
        description: paymentMethod ? `Wallet top-up via ${paymentMethod}` : "Wallet top-up",
        createdBy: req.user?._id
      });
      await transaction.save();

      return res.status(200).json({
        success: true,
        message: "Wallet topped up successfully",
        data: {
          amount,
          newBalance: account.walletBalance
        }
      });
    } catch (error: any) {
      if (error?.name === "CastError") {
        return res.status(400).json({
          success: false,
          message: "Invalid data",
          error: error.message
        });
      }
      if (error?.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      return res.status(500).json({
        success: false,
        message: "Error topping up wallet",
        error: error.message
      });
    }
  }

  // Wallet payment (deduct from wallet)
  async walletPayment(req: AuthRequest, res: Response) {
    try {
      const rawCustomerId = (req as any).body?.customerId ?? (req as any).body?.customer_id;
      const customerId = typeof rawCustomerId === "string" ? rawCustomerId : String(rawCustomerId ?? "");
      if (!mongoose.isValidObjectId(customerId)) {
        return res.status(400).json({
          success: false,
          message: "customerId/customer_id is required"
        });
      }

      const rawAmount = (req as any).body?.amount;
      const amount = typeof rawAmount === "string" ? Number(rawAmount) : rawAmount;
      if (typeof amount !== "number" || Number.isNaN(amount) || !Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "amount must be a valid number greater than 0"
        });
      }

      const rawSaleId = (req as any).body?.sale_id ?? (req as any).body?.saleId;
      const sale_id = rawSaleId && mongoose.isValidObjectId(rawSaleId) ? rawSaleId : undefined;

      const account = await LoyaltyAccount.findOne({ customer_id: customerId });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Loyalty account not found"
        });
      }

      if ((account.walletBalance ?? 0) < amount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance"
        });
      }

      account.walletBalance = (account.walletBalance ?? 0) - amount;
      await account.save();

      const transaction = new WalletTransaction({
        customer_id: customerId,
        type: "DEBIT",
        amount: -amount,
        balance: account.walletBalance,
        sale_id,
        description: sale_id ? `Payment for sale #${sale_id}` : "Wallet payment",
        createdBy: req.user?._id
      });
      await transaction.save();

      return res.status(200).json({
        success: true,
        message: "Wallet payment successful",
        data: {
          amountPaid: amount,
          newBalance: account.walletBalance
        }
      });
    } catch (error: any) {
      if (error?.name === "CastError") {
        return res.status(400).json({
          success: false,
          message: "Invalid data",
          error: error.message
        });
      }
      if (error?.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      return res.status(500).json({
        success: false,
        message: "Error processing wallet payment",
        error: error.message
      });
    }
  }

  // Get wallet history
  async getWalletHistory(req: AuthRequest, res: Response) {
    try {
      const { customerId } = req.params;
      if (!mongoose.isValidObjectId(customerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer id"
        });
      }
      const { page = 1, limit = 20 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const transactions = await WalletTransaction.find({ customer_id: customerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('sale_id', 'saleNumber totalAmount')
        .populate('createdBy', 'name');

      const total = await WalletTransaction.countDocuments({ customer_id: customerId });

      res.status(200).json({
        success: true,
        data: transactions,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching wallet history",
        error: error.message
      });
    }
  }
}

export default new LoyaltyController();
