import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../middleware/auth.middleware";
import Customer from "./customer.model";

export class CustomerController {
  // Create customer
  async createCustomer(req: AuthRequest, res: Response) {
    try {
      const { name, phone, email, address, dob, anniversary, notes } = (req as any).body;
      const branch_id = (req as any).body?.branch_id ?? req.user?.branch_id;
      const userId = req.user?._id ?? (req as any).body?.userId;

      console.log("Create Customer - userId:", userId, "branch_id:", branch_id);
      console.log("Create Customer - body:", { name, phone, email });

      // Check if phone already exists
      const existingCustomer = await Customer.findOne({ phone });
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: "Customer with this phone number already exists"
        });
      }

      // Generate customer code - find highest existing code number
      const lastCustomer = await Customer.findOne({ customerCode: { $regex: /^CUST-\d+$/ } })
        .sort({ customerCode: -1 })
        .select('customerCode');
      
      let customerNumber = 1;
      if (lastCustomer && lastCustomer.customerCode) {
        const match = lastCustomer.customerCode.match(/CUST-(\d+)/);
        if (match) {
          customerNumber = parseInt(match[1], 10) + 1;
        }
      }
      
      // Fallback: count total customers to ensure unique code
      if (customerNumber === 1) {
        const totalCustomers = await Customer.countDocuments();
        customerNumber = totalCustomers + 1;
      }
      
      const customerCode = `CUST-${String(customerNumber).padStart(6, '0')}`;
      console.log("Generated customerCode:", customerCode);

      if (!userId || !mongoose.isValidObjectId(userId)) {
        console.error("Invalid userId:", userId);
        return res.status(401).json({
          success: false,
          message: "Unauthorized - Invalid user ID"
        });
      }

      const customer = new Customer({
        customerCode,
        name,
        phone,
        email,
        address,
        dob,
        anniversary,
        branch_id,
        notes,
        createdBy: userId
      });

      await customer.save();

      res.status(201).json({
        success: true,
        message: "Customer registered successfully",
        data: customer
      });
    } catch (error: any) {
      console.error("Create customer error:", error);
      if (error?.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      if (error?.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Duplicate value",
          error: error.message
        });
      }
      return res.status(500).json({
        success: false,
        message: "Error creating customer",
        error: error.message
      });
    }
  }

  // Get all customers
  async getAllCustomers(req: AuthRequest, res: Response) {
    try {
      const { status, tier, search, page = 1, limit = 20 } = req.query;

      const query: any = { isWalkIn: false };
      
      if (status) query.status = status;
      if (tier) query.tier = tier;
      
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { customerCode: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);

      const customers = await Customer.find(query)
        .sort({ totalSpent: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Customer.countDocuments(query);

      res.status(200).json({
        success: true,
        data: customers,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching customers",
        error: error.message
      });
    }
  }

  // Get customer by ID
  async getCustomerById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const customer = await Customer.findById(id);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }

      res.status(200).json({
        success: true,
        data: customer
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching customer",
        error: error.message
      });
    }
  }

  // Get customer by phone
  async getCustomerByPhone(req: AuthRequest, res: Response) {
    try {
      const { phone } = req.params;

      const customer = await Customer.findOne({ phone });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }

      res.status(200).json({
        success: true,
        data: customer
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching customer",
        error: error.message
      });
    }
  }

  // Update customer
  async updateCustomer(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      delete updateData.customerCode;
      delete updateData.totalOrders;
      delete updateData.totalSpent;
      delete updateData.isWalkIn;

      const customer = await Customer.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Customer updated successfully",
        data: customer
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error updating customer",
        error: error.message
      });
    }
  }

  // Delete customer
  async deleteCustomer(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const customer = await Customer.findByIdAndUpdate(
        id,
        { status: 'INACTIVE' },
        { new: true }
      );

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Customer deleted successfully"
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error deleting customer",
        error: error.message
      });
    }
  }

  // Get walk-in customer
  async getWalkInCustomer(req: AuthRequest, res: Response) {
    try {
      let walkIn = await Customer.findOne({ isWalkIn: true });

      if (!walkIn) {
        // Create default walk-in customer
        const creator = req.user?._id ?? (req as any).body?.userId;
        if (!creator || !mongoose.isValidObjectId(creator)) {
          return res.status(401).json({
            success: false,
            message: "Unauthorized"
          });
        }

        walkIn = new Customer({
          customerCode: 'CUST-000000',
          name: 'Walk-in Customer',
          phone: '0000000000',
          isWalkIn: true,
          tier: 'BASIC',
          createdBy: creator
        });
        await walkIn.save();
      }

      res.status(200).json({
        success: true,
        data: walkIn
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching walk-in customer",
        error: error.message
      });
    }
  }

  // Get customer purchase history
  async getCustomerHistory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const customer = await Customer.findById(id);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }

      // This would need to query the Sales model
      // For now, return customer stats
      res.status(200).json({
        success: true,
        data: {
          customer: {
            name: customer.name,
            phone: customer.phone,
            tier: customer.tier
          },
          stats: {
            totalOrders: customer.totalOrders,
            totalSpent: customer.totalSpent,
            averageOrderValue: customer.averageOrderValue,
            lastVisit: customer.lastVisit
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching customer history",
        error: error.message
      });
    }
  }

  // Update customer stats (called after sale)
  async updateCustomerStats(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer id"
        });
      }

      const rawAmount =
        (req as any).body?.orderAmount ??
        (req as any).body?.totalAmount ??
        (req as any).query?.orderAmount ??
        (req as any).query?.totalAmount;
      const orderAmount = typeof rawAmount === "string" ? Number(rawAmount) : rawAmount;
      if (typeof orderAmount !== "number" || Number.isNaN(orderAmount) || !Number.isFinite(orderAmount)) {
        return res.status(400).json({
          success: false,
          message: "orderAmount must be a valid number. Send JSON body {\"orderAmount\": 100} or Params ?orderAmount=100"
        });
      }
      if (orderAmount < 0) {
        return res.status(400).json({
          success: false,
          message: "orderAmount cannot be negative"
        });
      }

      const branchId = (req as any).body?.branch_id ?? req.user?.branch_id;
      const customer = branchId
        ? await Customer.findOne({ _id: id, branch_id: branchId })
        : await Customer.findById(id);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }

      const totalOrders = (customer.totalOrders ?? 0) + 1;
      const totalSpent = (customer.totalSpent ?? 0) + orderAmount;

      customer.totalOrders = totalOrders;
      customer.totalSpent = totalSpent;
      customer.averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
      customer.lastVisit = new Date();

      // Auto-upgrade tier based on spending
      if (customer.totalSpent >= 100000) {
        customer.tier = 'PLATINUM';
      } else if (customer.totalSpent >= 50000) {
        customer.tier = 'GOLD';
      } else if (customer.totalSpent >= 25000) {
        customer.tier = 'SILVER';
      }

      await customer.save();

      return res.status(200).json({
        success: true,
        message: "Customer stats updated",
        data: customer
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
        message: "Error updating customer stats",
        error: error.message
      });
    }
  }
}

export default new CustomerController();
