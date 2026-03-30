import { Request, Response } from "express";
import Customer from "./customer.model";

export class CustomerController {
  // Create customer
  async createCustomer(req: Request, res: Response) {
    try {
      const { name, phone, email, address, dob, anniversary, notes } = req.body;
      const branch_id = req.body.branch_id;
      const userId = req.body.userId;

      // Check if phone already exists
      const existingCustomer = await Customer.findOne({ phone });
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: "Customer with this phone number already exists"
        });
      }

      // Generate customer code
      const lastCustomer = await Customer.findOne().sort({ createdAt: -1 });
      let customerNumber = 1;
      if (lastCustomer && lastCustomer.customerCode) {
        const lastNumber = parseInt(lastCustomer.customerCode.split('-')[1]);
        customerNumber = lastNumber + 1;
      }
      const customerCode = `CUST-${String(customerNumber).padStart(6, '0')}`;

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
      res.status(500).json({
        success: false,
        message: "Error creating customer",
        error: error.message
      });
    }
  }

  // Get all customers
  async getAllCustomers(req: Request, res: Response) {
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
  async getCustomerById(req: Request, res: Response) {
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
  async getCustomerByPhone(req: Request, res: Response) {
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
  async updateCustomer(req: Request, res: Response) {
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
  async deleteCustomer(req: Request, res: Response) {
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
  async getWalkInCustomer(req: Request, res: Response) {
    try {
      let walkIn = await Customer.findOne({ isWalkIn: true });

      if (!walkIn) {
        // Create default walk-in customer
        walkIn = new Customer({
          customerCode: 'CUST-000000',
          name: 'Walk-in Customer',
          phone: '0000000000',
          isWalkIn: true,
          tier: 'BASIC',
          createdBy: req.body.userId
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
  async getCustomerHistory(req: Request, res: Response) {
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
  async updateCustomerStats(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { orderAmount } = req.body;

      const customer = await Customer.findById(id);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }

      customer.totalOrders += 1;
      customer.totalSpent += orderAmount;
      customer.averageOrderValue = customer.totalSpent / customer.totalOrders;
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

      res.status(200).json({
        success: true,
        message: "Customer stats updated",
        data: customer
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error updating customer stats",
        error: error.message
      });
    }
  }
}

export default new CustomerController();
