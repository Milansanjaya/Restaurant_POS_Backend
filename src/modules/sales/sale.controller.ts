import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import Product from "../products/product.model";
import Sale from "./sale.model";
import Inventory from "../inventory/inventory.model";
import InventoryLog from "../inventory/inventoryLog.model";
import KitchenOrder from "../kitchen/kitchen.model";
import Shift from "../shifts/shift.model";
import { getIO } from "../../infrastructure/socket";
import Table from "../tables/table.model";

// ================= CREATE / ADD TO SALE =================
export const createSale = async (req: AuthRequest, res: Response) => {
  try {
    const openShift = await Shift.findOne({
      cashier: req.user?._id,
      status: "OPEN"
    });

    if (!openShift) {
      return res.status(400).json({
        message: "No open shift. Please open shift first."
      });
    }

    const { items, paymentMethod, discount = 0, tableId } = req.body;

    let subtotal = 0;
    let taxTotal = 0;
    const processedItems: any[] = [];

    let table: any = null;
    let sale: any = null;

    if (tableId) {
      table = await Table.findOne({
        _id: tableId,
        branch_id: req.user?.branch_id,
        isActive: true
      });

      if (!table) {
        return res.status(404).json({
          message: "Table not found"
        });
      }

      if (table.currentSale) {
        sale = await Sale.findOne({
          _id: table.currentSale,
          branch_id: req.user?.branch_id
        });

        if (!sale || !["OPEN", "PARTIALLY_PAID"].includes(sale.status)) {
          return res.status(400).json({
            message: "Invalid active sale for table"
          });
        }
      }
    }

    for (const item of items) {
      const product = await Product.findOne({
        _id: item.product,
        branch_id: req.user?.branch_id,
        isActive: true
      });

      if (!product) {
        return res.status(404).json({
          message: "Product not found"
        });
      }

      const inventory = await Inventory.findOne({
        product: product._id,
        branch_id: req.user?.branch_id,
        isActive: true
      });

      if (!inventory) {
        return res.status(404).json({
          message: `Inventory not found for ${product.name}`
        });
      }

      if (product.trackStock && inventory.stockQuantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}`
        });
      }

      const itemSubtotal = product.price * item.quantity;
      const itemTax = (itemSubtotal * product.taxRate) / 100;

      subtotal += itemSubtotal;
      taxTotal += itemTax;

      processedItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        taxRate: product.taxRate,
        subtotal: itemSubtotal,
        productName: product.name
      });
    }

    if (!sale) {
      const invoiceNumber = `INV-${Date.now()}`;
      const initialGrandTotal = subtotal + taxTotal - discount;

      sale = await Sale.create({
        invoiceNumber,
        branch_id: req.user?.branch_id,
        items: processedItems.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          price: item.price,
          taxRate: item.taxRate,
          subtotal: item.subtotal
        })),
        subtotal,
        taxTotal,
        discount,
        grandTotal: initialGrandTotal,
        createdBy: req.user?._id,

        // payment fields
        paymentMethod: table ? undefined : paymentMethod,
        payments: table
          ? []
          : [
              {
                amount: initialGrandTotal,
                paymentMethod,
                receivedBy: req.user?._id
              }
            ],
        paidAmount: table ? 0 : initialGrandTotal,
        balanceAmount: table ? initialGrandTotal : 0,
        status: table ? "OPEN" : "COMPLETED"
      });

      if (table) {
        table.status = "OCCUPIED";
        table.currentSale = sale._id;
        await table.save();
      }
    } else {
      sale.items.push(
        ...processedItems.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          price: item.price,
          taxRate: item.taxRate,
          subtotal: item.subtotal
        }))
      );

      sale.subtotal += subtotal;
      sale.taxTotal += taxTotal;
      sale.grandTotal = sale.subtotal + sale.taxTotal - sale.discount;
      sale.balanceAmount = sale.grandTotal - sale.paidAmount;

      await sale.save();
    }

    for (const item of processedItems) {
      const inventory = await Inventory.findOne({
        product: item.product,
        branch_id: req.user?.branch_id,
        isActive: true
      });

      if (inventory) {
        inventory.stockQuantity -= item.quantity;
        await inventory.save();

        await InventoryLog.create({
          product: item.product,
          branch_id: req.user?.branch_id,
          quantityChange: -item.quantity,
          type: "SALE",
          referenceId: sale._id,
          performedBy: req.user?._id
        });
      }
    }

    const kitchenOrder = await KitchenOrder.create({
      sale: sale._id,
      branch_id: req.user?.branch_id,
      items: processedItems.map((item) => ({
        product: item.product,
        name: item.productName,
        quantity: item.quantity
      })),
      createdBy: req.user?._id
    });

    getIO()
      .to(`branch:${req.user?.branch_id}`)
      .emit("kitchen:new-order", kitchenOrder);

    res.status(201).json({
      message: table
        ? sale.items.length > processedItems.length
          ? "Items added to table sale successfully"
          : "Table sale created successfully"
        : "Sale completed successfully",
      sale
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

// ================= CLOSE TABLE SALE =================
export const closeTableSale = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;
    const { paymentMethod } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({
        message: "paymentMethod is required"
      });
    }

    const table = await Table.findOne({
      _id: tableId,
      branch_id: req.user?.branch_id,
      isActive: true
    });

    if (!table || !table.currentSale) {
      return res.status(404).json({
        message: "No active sale for this table"
      });
    }

    const sale = await Sale.findOne({
      _id: table.currentSale,
      branch_id: req.user?.branch_id
    });

    if (!sale) {
      return res.status(404).json({
        message: "Sale not found"
      });
    }

    if (!["OPEN", "PARTIALLY_PAID"].includes(sale.status)) {
      return res.status(400).json({
        message: "Sale is not open"
      });
    }

    if (sale.balanceAmount > 0) {
      return res.status(400).json({
        message: "Sale still has remaining balance. Use payment endpoint first."
      });
    }

    sale.status = "COMPLETED";
    sale.paymentMethod = paymentMethod;
    await sale.save();

    table.status = "AVAILABLE";
    table.currentSale = undefined;
    await table.save();

    res.json({
      message: "Table sale closed successfully",
      sale
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

// ================= VOID SALE =================
export const voidSale = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const sale = await Sale.findOne({
      _id: id,
      branch_id: req.user?.branch_id
    });

    if (!sale) {
      return res.status(404).json({
        message: "Sale not found"
      });
    }

    if (sale.status === "VOIDED") {
      return res.status(400).json({
        message: "Sale already voided"
      });
    }

    for (const item of sale.items) {
      const inventory = await Inventory.findOne({
        product: item.product,
        branch_id: req.user?.branch_id,
        isActive: true
      });

      if (inventory) {
        inventory.stockQuantity += item.quantity;
        await inventory.save();

        await InventoryLog.create({
          product: item.product,
          branch_id: req.user?.branch_id,
          quantityChange: item.quantity,
          type: "RETURN",
          referenceId: sale._id,
          performedBy: req.user?._id
        });
      }
    }

    const table = await Table.findOne({
      currentSale: sale._id,
      branch_id: req.user?.branch_id,
      isActive: true
    });

    if (table) {
      table.status = "AVAILABLE";
      table.currentSale = undefined;
      await table.save();
    }

    sale.status = "VOIDED";
    sale.voidedBy = req.user?._id;
    sale.voidedAt = new Date();
    sale.voidReason = reason;

    await sale.save();

    res.json({
      message: "Sale voided successfully"
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

// ================= PAY SALE =================
export const paySale = async (req: AuthRequest, res: Response) => {
  try {
    const { saleId } = req.params;
    const { amount, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        message: "Valid payment amount is required"
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        message: "paymentMethod is required"
      });
    }

    const sale = await Sale.findOne({
      _id: saleId,
      branch_id: req.user?.branch_id
    });

    if (!sale) {
      return res.status(404).json({
        message: "Sale not found"
      });
    }

    if (sale.status === "VOIDED") {
      return res.status(400).json({
        message: "Cannot pay a voided sale"
      });
    }

    if (sale.status === "COMPLETED") {
      return res.status(400).json({
        message: "Sale already completed"
      });
    }

    if (amount > sale.balanceAmount) {
      return res.status(400).json({
        message: "Payment exceeds remaining balance"
      });
    }

    sale.payments.push({
      amount,
      paymentMethod,
      receivedBy: req.user?._id
    } as any);

    sale.paidAmount += amount;
    sale.balanceAmount = sale.grandTotal - sale.paidAmount;

    if (sale.balanceAmount <= 0) {
      sale.status = "COMPLETED";
      sale.paymentMethod = paymentMethod;

      const table = await Table.findOne({
        currentSale: sale._id,
        branch_id: req.user?.branch_id,
        isActive: true
      });

      if (table) {
        table.status = "AVAILABLE";
        table.currentSale = undefined;
        await table.save();
      }
    } else {
      sale.status = "PARTIALLY_PAID";
    }

    await sale.save();

    res.json({
      message:
        sale.status === "COMPLETED"
          ? "Sale fully paid and completed"
          : "Partial payment recorded",
      sale
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};