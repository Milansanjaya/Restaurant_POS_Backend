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
import Reservation from "../reservations/reservation.model";
import Coupon from "../coupons/coupon.model";
import FIFOBatchService from "./fifoBatchService";  // FIFO service

// ================= GET ALL SALES =================
export const getSales = async (req: AuthRequest, res: Response) => {
  try {
    const branchId = req.user?.branch_id;

    if (!branchId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(
      200,
      Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20)
    );
    const skip = (page - 1) * limit;

    const query: any = { branch_id: branchId };

    if (req.query.status) {
      query.status = String(req.query.status);
    }

    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    if ((from && !isNaN(from.getTime())) || (to && !isNaN(to.getTime()))) {
      query.createdAt = {};
      if (from && !isNaN(from.getTime())) query.createdAt.$gte = from;
      if (to && !isNaN(to.getTime())) query.createdAt.$lte = to;
    }

    const [total, sales] = await Promise.all([
      Sale.countDocuments(query),
      Sale.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email")
        .populate("items.product", "name price")
    ]);

    res.json({
      page,
      limit,
      total,
      sales
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

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

    const {
      items,
      paymentMethod,
      tableId,
      reservationId,
      discountType,
      discountValue,
      couponCode,
      customerId  // Optional customer for loyalty tracking
    } = req.body;

    let subtotal = 0;
    let taxTotal = 0;
    const processedItems: any[] = [];

    let table: any = null;
    let sale: any = null;
    let reservation: any = null;

    // ✅ Validate table
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

    // ✅ Validate reservation
    if (reservationId) {
      reservation = await Reservation.findOne({
        _id: reservationId,
        branch_id: req.user?.branch_id
      });

      if (!reservation) {
        return res.status(404).json({
          message: "Reservation not found"
        });
      }

      if (reservation.status !== "SEATED") {
        return res.status(400).json({
          message: "Reservation must be SEATED to start order"
        });
      }

      if (table && reservation.table?.toString() !== table._id.toString()) {
        return res.status(400).json({
          message: "Reservation is not linked to the selected table"
        });
      }
    }

    // ✅ Validate items + inventory + calculate
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

    // ✅ Discount / coupon logic
    let finalDiscount = 0;
    let appliedDiscountType = discountType;
    let appliedDiscountValue = discountValue;
    let appliedCouponCode = couponCode;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode });

      if (!coupon || !coupon.isActive) {
        return res.status(400).json({
          message: "Invalid coupon"
        });
      }

      if (coupon.expiryDate < new Date()) {
        return res.status(400).json({
          message: "Coupon expired"
        });
      }

      if (coupon.discountType === "PERCENTAGE") {
        finalDiscount = (subtotal + taxTotal) * (coupon.value / 100);
      } else {
        finalDiscount = coupon.value;
      }

      appliedDiscountType = coupon.discountType;
      appliedDiscountValue = coupon.value;
    } else if (discountType && discountValue) {
      if (discountType === "PERCENTAGE") {
        finalDiscount = (subtotal + taxTotal) * (discountValue / 100);
      } else {
        finalDiscount = discountValue;
      }
    }

    if (finalDiscount > subtotal + taxTotal) {
      finalDiscount = subtotal + taxTotal;
    }

    // ✅ Create new sale if no active one exists
    if (!sale) {
      const invoiceNumber = `INV-${Date.now()}`;
      const initialGrandTotal = subtotal + taxTotal - finalDiscount;

      sale = await Sale.create({
        invoiceNumber,
        branch_id: req.user?.branch_id,
        customer_id: customerId || undefined,  // Optional customer for loyalty
        items: processedItems.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          price: item.price,
          taxRate: item.taxRate,
          subtotal: item.subtotal
        })),
        subtotal,
        taxTotal,
        discount: finalDiscount,
        discountType: appliedDiscountType,
        discountValue: appliedDiscountValue || 0,
        couponCode: appliedCouponCode || undefined,
        grandTotal: initialGrandTotal,
        createdBy: req.user?._id,

        reservation: reservation ? reservation._id : undefined,

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

      if (!table && reservation && sale.status === "COMPLETED") {
        reservation.status = "COMPLETED";
        await reservation.save();
      }
    } else {
      // ✅ Existing active table sale: append items only
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

      // For appended table orders, only apply new discount if explicitly provided now.
      let additionalDiscount = 0;

      if (couponCode) {
        const coupon = await Coupon.findOne({ code: couponCode });

        if (!coupon || !coupon.isActive) {
          return res.status(400).json({
            message: "Invalid coupon"
          });
        }

        if (coupon.expiryDate < new Date()) {
          return res.status(400).json({
            message: "Coupon expired"
          });
        }

        if (coupon.discountType === "PERCENTAGE") {
          additionalDiscount = (subtotal + taxTotal) * (coupon.value / 100);
        } else {
          additionalDiscount = coupon.value;
        }

        sale.discount += additionalDiscount;
        sale.discountType = coupon.discountType;
        sale.discountValue = coupon.value;
        sale.couponCode = coupon.code;
      } else if (discountType && discountValue) {
        if (discountType === "PERCENTAGE") {
          additionalDiscount = (subtotal + taxTotal) * (discountValue / 100);
        } else {
          additionalDiscount = discountValue;
        }

        sale.discount += additionalDiscount;
        sale.discountType = discountType;
        sale.discountValue = discountValue;
      }

      if (!sale.reservation && reservation) {
        sale.reservation = reservation._id;
      }

      sale.grandTotal = sale.subtotal + sale.taxTotal - sale.discount;
      sale.balanceAmount = sale.grandTotal - sale.paidAmount;

      await sale.save();
    }

    // ✅ Deduct inventory using FIFO batch system (for products with trackStock enabled)
    for (let i = 0; i < processedItems.length; i++) {
      const item = processedItems[i];
      const product = await Product.findById(item.product);
      
      // Only deduct stock for products that track inventory
      if (product?.trackStock) {
        try {
          // Try FIFO batch deduction first
          const batchDeductions = await FIFOBatchService.deductFromBatchesFIFO(
            item.product,
            item.quantity,
            req.user?.branch_id || '',
            sale._id,
            req.user?._id
          );
          
          // Update sale item with batch info (use first batch for simplicity)
          if (batchDeductions.length > 0) {
            sale.items[i].batch_id = batchDeductions[0].batch_id;
            sale.items[i].batchNumber = batchDeductions[0].batchNumber;
          }
        } catch (batchError) {
          // Fallback: If no batches available, use traditional inventory deduction
          console.log(`FIFO fallback for product ${item.product}: ${batchError}`);
          
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
      }
    }
    
    // Save sale with batch info
    await sale.save();

    // ✅ Kitchen order for only newly added items
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
    const body = (req.body || {}) as any;
    const paymentMethod =
      body.paymentMethod || (req.query.paymentMethod as string | undefined);

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

    if (sale.reservation) {
      await Reservation.findByIdAndUpdate(sale.reservation, {
        status: "COMPLETED"
      });
    }

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

    if (sale.reservation) {
      await Reservation.findByIdAndUpdate(sale.reservation, {
        status: "CANCELLED"
      });
    }

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

      if (sale.reservation) {
        await Reservation.findByIdAndUpdate(sale.reservation, {
          status: "COMPLETED"
        });
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

export const refundSale = async (req: AuthRequest, res: Response) => {
  try {
    const { saleId } = req.params;
    const { items, reason } = req.body;

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
        message: "Cannot refund voided sale"
      });
    }

    let refundAmount = 0;

    // 🔹 Full refund
    if (!items || items.length === 0) {
      refundAmount = sale.grandTotal;

      // restore inventory
      for (const item of sale.items) {
        const inventory = await Inventory.findOne({
          product: item.product,
          branch_id: req.user?.branch_id
        });

        if (inventory) {
          inventory.stockQuantity += item.quantity;
          await inventory.save();
        }
      }

      sale.status = "VOIDED";
    }

    // 🔹 Partial refund
    else {
      for (const rItem of items) {
        const saleItem = sale.items.find(
          (i: any) => i.product.toString() === rItem.product
        );

        if (!saleItem || rItem.quantity > saleItem.quantity) {
          return res.status(400).json({
            message: "Invalid refund quantity"
          });
        }

        const itemRefund = saleItem.price * rItem.quantity;
        refundAmount += itemRefund;

        // reduce quantity
        saleItem.quantity -= rItem.quantity;

        // restore stock
        const inventory = await Inventory.findOne({
          product: rItem.product,
          branch_id: req.user?.branch_id
        });

        if (inventory) {
          inventory.stockQuantity += rItem.quantity;
          await inventory.save();
        }
      }

      // remove zero items
      sale.items = sale.items.filter((i: any) => i.quantity > 0);

      sale.subtotal -= refundAmount;
      sale.grandTotal -= refundAmount;
      sale.balanceAmount = sale.grandTotal - sale.paidAmount;
    }

    // log refund
    sale.refunds.push({
      amount: refundAmount,
      reason,
      items,
      refundedBy: req.user?._id
    } as any);

    await sale.save();

    res.json({
      message: "Refund processed successfully",
      refundAmount,
      sale
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message
    });
  }
};

// ================= GET INVOICE =================
export const getInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { saleId } = req.params;

    const sale = await Sale.findOne({
      _id: saleId,
      branch_id: req.user?.branch_id
    })
      .populate("items.product")
      .populate("createdBy", "name email")
      .populate("reservation");

    if (!sale) {
      return res.status(404).json({
        message: "Sale not found"
      });
    }

    const table = await Table.findOne({
      currentSale: sale._id,
      branch_id: req.user?.branch_id
    });

    const invoice = {
      invoiceNumber: sale.invoiceNumber,
      date: sale.createdAt,

      table: table
        ? {
            tableNumber: table.tableNumber,
            section: table.section
          }
        : null,

      reservation: sale.reservation || null,

      cashier: sale.createdBy,

      items: sale.items.map((item: any) => ({
        productName: item.product?.name || "Unknown",
        quantity: item.quantity,
        price: item.price,
        taxRate: item.taxRate,
        subtotal: item.subtotal
      })),

      summary: {
        subtotal: sale.subtotal,
        taxTotal: sale.taxTotal,
        discount: sale.discount,
        grandTotal: sale.grandTotal,
        paidAmount: sale.paidAmount,
        balanceAmount: sale.balanceAmount
      },

      payments: sale.payments.map((p: any) => ({
        amount: p.amount,
        method: p.paymentMethod,
        paidAt: p.paidAt
      })),

      status: sale.status
    };

    res.json({
      message: "Invoice fetched successfully",
      invoice
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};