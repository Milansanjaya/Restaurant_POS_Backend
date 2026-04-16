import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import Supplier from "./supplier.model";
import SupplierTransaction from "./supplierTransaction.model";

// Generate supplier code
const generateSupplierCode = async (branchId: string): Promise<string> => {
  const lastSupplier = await Supplier.findOne({ branch_id: branchId })
    .sort({ createdAt: -1 });
  const lastNumber = lastSupplier ? parseInt(lastSupplier.code.split("-")[1] || "0") : 0;
  return `SUP-${String(lastNumber + 1).padStart(6, "0")}`;
};

export const createSupplier = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      contactPerson,
      phone,
      email,
      address,
      creditLimit,
      paymentTerms,
      gstNumber,
      panNumber
    } = req.body;

    const code = await generateSupplierCode(req.user?.branch_id!);

    const supplier = await Supplier.create({
      code,
      name,
      contactPerson,
      phone,
      email,
      address,
      creditLimit,
      paymentTerms,
      gstNumber,
      panNumber,
      branch_id: req.user?.branch_id,
      outstandingBalance: 0,
      createdBy: req.user?._id
    });

    res.status(201).json({
      message: "Supplier created successfully",
      supplier
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSuppliers = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query: any = { branch_id: req.user?.branch_id };

    if (status) query.status = status;

    const suppliers = await Supplier.find(query)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Supplier.countDocuments(query);

    res.status(200).json({
      suppliers,
      pagination: { page, limit, total, pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSupplierById = async (req: AuthRequest, res: Response) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      branch_id: req.user?.branch_id
    });

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.status(200).json(supplier);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSupplier = async (req: AuthRequest, res: Response) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, branch_id: req.user?.branch_id },
      req.body,
      { new: true }
    );

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.status(200).json({
      message: "Supplier updated successfully",
      supplier
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteSupplier = async (req: AuthRequest, res: Response) => {
  try {
    const supplier = await Supplier.findOneAndDelete({
      _id: req.params.id,
      branch_id: req.user?.branch_id
    });

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.status(200).json({ message: "Supplier deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSupplierLedger = async (req: AuthRequest, res: Response) => {
  try {
    const supplierId = req.params.id;

    const transactions = await SupplierTransaction.find({
      supplier_id: supplierId,
      branch_id: req.user?.branch_id
    }).sort({ createdAt: -1 });

    const supplier = await Supplier.findOne({
      _id: supplierId,
      branch_id: req.user?.branch_id
    });

    res.status(200).json({
      supplier,
      transactions,
      outstandingBalance: supplier?.outstandingBalance
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const recordSupplierPayment = async (req: AuthRequest, res: Response) => {
  try {
    // Preferred: /api/suppliers/:id/payment
    const supplierId = req.params.id || req.body?.supplierId;
    const amountRaw = req.body?.amount;
    const description = req.body?.description;

    if (!supplierId) {
      return res.status(400).json({ message: "supplierId is required" });
    }

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "amount must be a positive number" });
    }

    const supplier = await Supplier.findOne({
      _id: supplierId,
      branch_id: req.user?.branch_id
    });

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    // Create payment transaction
    await SupplierTransaction.create({
      supplier_id: supplierId,
      transactionType: "PAYMENT",
      amount,
      description,
      branch_id: req.user?.branch_id,
      createdBy: req.user?._id
    });

    // Update outstanding balance
    const newBalance = Math.max((supplier.outstandingBalance || 0) - amount, 0);
    await Supplier.findByIdAndUpdate(supplierId, {
      outstandingBalance: newBalance
    });

    res.status(200).json({
      message: "Payment recorded successfully",
      outstandingBalance: newBalance
    });
  } catch (error: any) {
    if (error?.name === "CastError") {
      return res.status(400).json({ message: "Invalid supplier id" });
    }
    res.status(500).json({ message: error.message });
  }
};
