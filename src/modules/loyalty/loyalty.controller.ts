import { Request, Response } from "express";
import LoyaltyAccount from "./loyaltyAccount.model";
import LoyaltyTransaction from "./loyaltyTransaction.model";
import WalletTransaction from "./walletTransaction.model";
import Customer from "../customers/customer.model";

export class LoyaltyController {
  // Get or create loyalty account
  async getLoyaltyAccount(req: Request, res: Response) {
    try {
      const { customerId } = req.params;

      let account = await LoyaltyAccount.findOne({ customer_id: customerId })
        .populate('customer_id', 'name phone tier');

      if (!account) {
        // Create new account
        account = new LoyaltyAccount({
          customer_id: customerId
        });
        await account.save();
        await account.populate('customer_id', 'name phone tier');
      }

      res.status(200).json({
        success: true,
        data: account
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching loyalty account",
        error: error.message
      });
    }
  }

  // Earn points (called after sale)
  async earnPoints(req: Request, res: Response) {
    try {
      const { customerId, saleAmount, sale_id } = req.body;
      const userId = req.body.userId;

      // Points calculation: 1 point per $10 spent
      const pointsEarned = Math.floor(saleAmount / 10);

      if (pointsEarned === 0) {
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

      // Update account
      account.pointsBalance += pointsEarned;
      account.lifetimePoints += pointsEarned;
      
      // Set expiry date (1 year from now)
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      account.pointsExpiryDate = expiryDate;

      await account.save();

      // Create transaction
      const transaction = new LoyaltyTransaction({
        customer_id: customerId,
        type: 'EARNED',
        points: pointsEarned,
        balance: account.pointsBalance,
        sale_id,
        expiryDate,
        description: `Earned from sale #${sale_id}`,
        createdBy: userId
      });
      await transaction.save();

      res.status(200).json({
        success: true,
        message: "Points earned successfully",
        data: {
          pointsEarned,
          newBalance: account.pointsBalance
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error earning points",
        error: error.message
      });
    }
  }

  // Redeem points
  async redeemPoints(req: Request, res: Response) {
    try {
      const { customerId, points, sale_id } = req.body;
      const userId = req.body.userId;

      const account = await LoyaltyAccount.findOne({ customer_id: customerId });
      
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Loyalty account not found"
        });
      }

      if (account.pointsBalance < points) {
        return res.status(400).json({
          success: false,
          message: "Insufficient points balance"
        });
      }

      // Update account
      account.pointsBalance -= points;
      account.redeemedPoints += points;
      await account.save();

      // Create transaction
      const transaction = new LoyaltyTransaction({
        customer_id: customerId,
        type: 'REDEEMED',
        points: -points,
        balance: account.pointsBalance,
        sale_id,
        description: `Redeemed for sale #${sale_id}`,
        createdBy: userId
      });
      await transaction.save();

      // Points to discount conversion: 100 points = $10
      const discountAmount = (points / 100) * 10;

      res.status(200).json({
        success: true,
        message: "Points redeemed successfully",
        data: {
          pointsRedeemed: points,
          discountAmount,
          newBalance: account.pointsBalance
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error redeeming points",
        error: error.message
      });
    }
  }

  // Get points history
  async getPointsHistory(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
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
  async walletTopup(req: Request, res: Response) {
    try {
      const { customerId, amount, paymentMethod } = req.body;
      const userId = req.body.userId;

      let account = await LoyaltyAccount.findOne({ customer_id: customerId });
      
      if (!account) {
        account = new LoyaltyAccount({ customer_id: customerId });
      }

      // Update wallet balance
      account.walletBalance += amount;
      await account.save();

      // Create transaction
      const transaction = new WalletTransaction({
        customer_id: customerId,
        type: 'CREDIT',
        amount,
        balance: account.walletBalance,
        paymentMethod,
        description: `Wallet top-up via ${paymentMethod}`,
        createdBy: userId
      });
      await transaction.save();

      res.status(200).json({
        success: true,
        message: "Wallet topped up successfully",
        data: {
          amount,
          newBalance: account.walletBalance
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error topping up wallet",
        error: error.message
      });
    }
  }

  // Wallet payment (deduct from wallet)
  async walletPayment(req: Request, res: Response) {
    try {
      const { customerId, amount, sale_id } = req.body;
      const userId = req.body.userId;

      const account = await LoyaltyAccount.findOne({ customer_id: customerId });
      
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Loyalty account not found"
        });
      }

      if (account.walletBalance < amount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance"
        });
      }

      // Deduct from wallet
      account.walletBalance -= amount;
      await account.save();

      // Create transaction
      const transaction = new WalletTransaction({
        customer_id: customerId,
        type: 'DEBIT',
        amount: -amount,
        balance: account.walletBalance,
        sale_id,
        description: `Payment for sale #${sale_id}`,
        createdBy: userId
      });
      await transaction.save();

      res.status(200).json({
        success: true,
        message: "Wallet payment successful",
        data: {
          amountPaid: amount,
          newBalance: account.walletBalance
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error processing wallet payment",
        error: error.message
      });
    }
  }

  // Get wallet history
  async getWalletHistory(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
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
