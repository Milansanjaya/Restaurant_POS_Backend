import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../../middleware/auth.middleware';
import Discount from './discount.model';

const toNumber = (v: any) => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const toDate = (v: any) => {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const isDiscountType = (v: any): v is 'FLAT' | 'PERCENTAGE' => v === 'FLAT' || v === 'PERCENTAGE';

const validateDiscountValue = (discountType: 'FLAT' | 'PERCENTAGE', value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return 'value must be a positive number';
  }
  if (discountType === 'PERCENTAGE' && value > 100) {
    return 'percentage discount cannot exceed 100';
  }
  return null;
};

const validateDateRange = (validFrom?: Date, validTo?: Date) => {
  if (validFrom && validTo && validFrom.getTime() > validTo.getTime()) {
    return 'validFrom cannot be after validTo';
  }
  return null;
};

export const createDiscount = async (req: AuthRequest, res: Response) => {
  try {
    const branch_id = req.user?.branch_id;
    const createdBy = req.user?._id;

    if (!branch_id || !createdBy) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const body = req.body || {};

    const name = String(body.name || '').trim();
    const discountType = body.discountType;
    const value = toNumber(body.value);
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : true;

    const validFrom = toDate(body.validFrom);
    const validTo = toDate(body.validTo);

    const missing: string[] = [];
    if (!name) missing.push('name');
    if (!discountType) missing.push('discountType');
    if (value === undefined) missing.push('value');

    if (missing.length) {
      return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
    }

    if (!isDiscountType(discountType)) {
      return res.status(400).json({ message: 'discountType must be FLAT or PERCENTAGE' });
    }

    const valueError = validateDiscountValue(discountType, value!);
    if (valueError) {
      return res.status(400).json({ message: valueError });
    }

    const rangeError = validateDateRange(validFrom, validTo);
    if (rangeError) {
      return res.status(400).json({ message: rangeError });
    }

    const discount = await Discount.create({
      name,
      discountType,
      value,
      isActive,
      validFrom,
      validTo,
      branch_id,
      createdBy,
    });

    return res.status(201).json({
      message: 'Discount created successfully',
      discount,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

export const getDiscounts = async (req: AuthRequest, res: Response) => {
  try {
    const branch_id = req.user?.branch_id;
    if (!branch_id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const discounts = await Discount.find({ branch_id }).sort({ createdAt: -1 });
    return res.json(discounts);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

export const getDiscountById = async (req: AuthRequest, res: Response) => {
  try {
    const branch_id = req.user?.branch_id;
    if (!branch_id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const id = String((req.params as any).id || '');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid discount id' });
    }

    const discount = await Discount.findOne({ _id: id, branch_id });
    if (!discount) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    return res.json({ discount });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

export const updateDiscount = async (req: AuthRequest, res: Response) => {
  try {
    const branch_id = req.user?.branch_id;
    if (!branch_id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const id = String((req.params as any).id || '');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid discount id' });
    }

    const body = req.body || {};
    const update: any = { ...body };

    if (update.name !== undefined) {
      update.name = String(update.name || '').trim();
      if (!update.name) {
        return res.status(400).json({ message: 'name cannot be empty' });
      }
    }

    if (update.discountType !== undefined) {
      if (!isDiscountType(update.discountType)) {
        return res.status(400).json({ message: 'discountType must be FLAT or PERCENTAGE' });
      }
    }

    if (update.value !== undefined) {
      const n = toNumber(update.value);
      if (n === undefined) {
        return res.status(400).json({ message: 'value must be a number' });
      }
      update.value = n;
    }

    if (update.validFrom !== undefined) update.validFrom = toDate(update.validFrom);
    if (update.validTo !== undefined) update.validTo = toDate(update.validTo);

    const current = await Discount.findOne({ _id: id, branch_id });
    if (!current) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    const nextType: 'FLAT' | 'PERCENTAGE' = (update.discountType ?? current.discountType) as any;
    const nextValue: number = (update.value ?? current.value) as any;

    const valueError = validateDiscountValue(nextType, nextValue);
    if (valueError) {
      return res.status(400).json({ message: valueError });
    }

    const nextFrom = update.validFrom !== undefined ? update.validFrom : current.validFrom;
    const nextTo = update.validTo !== undefined ? update.validTo : current.validTo;

    const rangeError = validateDateRange(nextFrom, nextTo);
    if (rangeError) {
      return res.status(400).json({ message: rangeError });
    }

    const discount = await Discount.findOneAndUpdate(
      { _id: id, branch_id },
      update,
      { new: true, runValidators: true }
    );

    return res.json({ message: 'Discount updated', discount });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

export const toggleDiscount = async (req: AuthRequest, res: Response) => {
  try {
    const branch_id = req.user?.branch_id;
    if (!branch_id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const id = String((req.params as any).id || '');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid discount id' });
    }
    const discount = await Discount.findOne({ _id: id, branch_id });
    if (!discount) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    discount.isActive = !discount.isActive;
    await discount.save();

    return res.json({ message: 'Discount status updated', discount });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

export const deleteDiscount = async (req: AuthRequest, res: Response) => {
  try {
    const branch_id = req.user?.branch_id;
    if (!branch_id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const id = String((req.params as any).id || '');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid discount id' });
    }
    const discount = await Discount.findOneAndDelete({ _id: id, branch_id });
    if (!discount) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    return res.json({ message: 'Discount deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
};
