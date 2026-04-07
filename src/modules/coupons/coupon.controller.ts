import { Request, Response } from "express";
import Coupon from "./coupon.model";

const toNumber = (v: any) => {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const toDate = (v: any) => {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

// ================= CREATE COUPON =================
export const createCoupon = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};

    const code = body.code;
    const discountType = body.discountType;

    // Accept client aliases (Postman collection uses discountValue + validTo)
    const value = toNumber(body.value ?? body.discountValue ?? body.discount_value);
    const expiryDate = toDate(body.expiryDate ?? body.validTo ?? body.valid_to);

    const minOrderValue = toNumber(body.minOrderValue ?? body.min_order_value);
    const maxDiscount = toNumber(body.maxDiscount ?? body.max_discount);
    const validFrom = toDate(body.validFrom ?? body.valid_from);
    const validTo = toDate(body.validTo ?? body.valid_to);
    const usageLimit = toNumber(body.usageLimit ?? body.usage_limit);

    const missing: string[] = [];
    if (!code) missing.push("code");
    if (!discountType) missing.push("discountType");
    if (value === undefined) missing.push("value/discountValue");
    if (!expiryDate) missing.push("expiryDate/validTo");

    if (missing.length) {
      return res.status(400).json({
        message: `Missing required fields: ${missing.join(", ")}`
      });
    }

    const exists = await Coupon.findOne({ code });

    if (exists) {
      return res.status(400).json({
        message: "Coupon already exists"
      });
    }

    if (!["FLAT", "PERCENTAGE"].includes(discountType)) {
      return res.status(400).json({
        message: "discountType must be FLAT or PERCENTAGE"
      });
    }

    if (value === undefined || value <= 0) {
      return res.status(400).json({
        message: "value must be a positive number"
      });
    }

    const coupon = await Coupon.create({
      code,
      discountType,
      value,
      expiryDate,
      minOrderValue,
      maxDiscount,
      validFrom,
      validTo: validTo || expiryDate,
      usageLimit
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
    const body = req.body || {};

    const update: any = { ...body };

    // Map common aliases
    if (update.discountValue !== undefined && update.value === undefined) {
      update.value = toNumber(update.discountValue);
      delete update.discountValue;
    }
    if (update.validTo !== undefined && update.expiryDate === undefined) {
      update.expiryDate = toDate(update.validTo);
    }

    if (update.value !== undefined) {
      const n = toNumber(update.value);
      if (n === undefined || n <= 0) {
        return res.status(400).json({
          message: "value must be a positive number"
        });
      }
      update.value = n;
    }

    if (update.expiryDate !== undefined) {
      const d = toDate(update.expiryDate);
      if (!d) {
        return res.status(400).json({
          message: "expiryDate/validTo must be a valid date"
        });
      }
      update.expiryDate = d;
      update.validTo = toDate(update.validTo) || d;
    }

    const coupon = await Coupon.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true
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

// ================= DELETE COUPON =================
export const deleteCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return res.status(404).json({
        message: "Coupon not found"
      });
    }

    res.json({
      message: "Coupon deleted successfully"
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message
    });
  }
};

// ================= VALIDATE COUPON =================
export const validateCoupon = async (req: Request, res: Response) => {
  try {
    const { code, orderTotal } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required"
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid coupon code"
      });
    }

    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: "Coupon is not active"
      });
    }

    const now = new Date();
    
    if (coupon.validFrom && coupon.validFrom > now) {
      return res.status(400).json({
        success: false,
        message: "Coupon is not yet valid"
      });
    }

    if (coupon.expiryDate < now) {
      return res.status(400).json({
        success: false,
        message: "Coupon has expired"
      });
    }

    if (coupon.usageLimit && (coupon.timesUsed || 0) >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: "Coupon usage limit reached"
      });
    }

    const total = toNumber(orderTotal) || 0;
    
    if (coupon.minOrderValue && total < coupon.minOrderValue) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value is Rs. ${coupon.minOrderValue}`
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discount = (total * coupon.value) / 100;
      // Apply max discount cap if exists
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      // FLAT discount
      discount = coupon.value;
    }

    // Discount cannot exceed order total
    if (discount > total) {
      discount = total;
    }

    res.json({
      success: true,
      message: "Coupon is valid",
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        value: coupon.value,
        maxDiscount: coupon.maxDiscount,
        minOrderValue: coupon.minOrderValue
      },
      discount: Math.round(discount * 100) / 100,
      finalTotal: Math.round((total - discount) * 100) / 100
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};