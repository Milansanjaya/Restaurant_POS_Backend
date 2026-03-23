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
// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Enterprise POS API Running"
  });
});

export default app;