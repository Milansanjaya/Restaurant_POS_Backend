import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./modules/auth/auth.routes";
import productRoutes from "./modules/products/product.routes";
import saleRoutes from "./modules/sales/sale.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import reportRoutes from "./modules/reports/reports.routes";
import shiftRoutes from "./modules/shifts/shift.routes";
import kitchenRoutes from "./modules/kitchen/kitchen.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import tableRoutes from "./modules/tables/table.routes";
import reservationRoutes from "./modules/reservations/reservation.routes";
import couponRoutes from "./modules/coupons/coupon.routes";
import supplierRoutes from "./modules/suppliers/supplier.routes";
import purchaseOrderRoutes from "./modules/purchase-orders/purchaseOrder.routes";
import grnRoutes from "./modules/grn/grn.routes";
import batchRoutes from "./modules/batches/batch.routes";
import customerRoutes from "./modules/customers/customer.routes";
import loyaltyRoutes from "./modules/loyalty/loyalty.routes";
import categoryRoutes from "./modules/categories/category.routes";
import unitRoutes from "./modules/units/unit.routes";
import configRoutes from "./modules/config/config.routes";
import returnRoutes from "./modules/returns/return.routes";
import orderReturnRoutes from "./modules/order-returns/orderReturn.routes";
import roleRoutes from "./modules/roles/role.routes";
import userRoutes from "./modules/users/user.routes";

const app: Application = express();

// Security headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Request logging
app.use(morgan("dev"));

// Body parser
app.use(express.json());


app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/kitchen", kitchenRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/grn", grnRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/config", configRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/order-returns", orderReturnRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/users", userRoutes);

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Enterprise POS API Running"
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("UNHANDLED ERROR:", err);
  res.status(err?.status || 500).json({
    message: err?.message || "Internal server error"
  });
});

export default app;