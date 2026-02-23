import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./modules/auth/auth.routes";


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

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Enterprise POS API Running"
  });
});

export default app;