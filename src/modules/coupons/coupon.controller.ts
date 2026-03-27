import { Request, Response } from "express";
import Coupon from "./coupon.model";

// ================= CREATE COUPON =================
export const createCoupon = async (req: Request, res: Response) => {
  try {
    const { code, discountType, value, expiryDate } = req.body;

    if (!code || !discountType || !value || !expiryDate) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const exists = await Coupon.findOne({ code });

    if (exists) {
      return res.status(400).json({
        message: "Coupon already exists"
      });
    }

    const coupon = await Coupon.create({
      code,
      discountType,
      value,
      expiryDate
    });

    res.status(201).json({
      message: "Coupon created successfully",
      coupon
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message
    });
  }
};

// ================= GET ALL COUPONS =================
export const getCoupons = async (_req: Request, res: Response) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });

    res.json(coupons);
  } catch (error: any) {
    res.status(500).json({
      message: error.message
    });
  }
};

// ================= UPDATE COUPON =================
export const updateCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByIdAndUpdate(id, req.body, {
      new: true
    });

    if (!coupon) {
      return res.status(404).json({
        message: "Coupon not found"
      });
    }

    res.json({
      message: "Coupon updated",
      coupon
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message
    });
  }
};

// ================= TOGGLE ACTIVE =================
export const toggleCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({
        message: "Coupon not found"
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.json({
      message: "Coupon status updated",
      coupon
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message
    });
  }
};