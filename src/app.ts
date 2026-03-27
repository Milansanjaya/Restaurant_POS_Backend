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


// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Enterprise POS API Running"
  });
});

export default app;