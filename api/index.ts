import dotenv from "dotenv";
dotenv.config();

import app from "../src/app";
import { connectDatabase } from "../src/config/database";
import { seedPermissions, seedRoles } from "../src/shared/seedPermissions";
import { assignAdminPermissions } from "../src/shared/assignAdminPermissions";

let isConnected = false;

export default async (req: any, res: any) => {
  if (!isConnected) {
    try {
      await connectDatabase();
      await seedPermissions();
      await seedRoles();
      await assignAdminPermissions();
      isConnected = true;
    } catch (error) {
      console.error("Database connection failed:", error);
      return res.status(500).json({ error: "Database connection failed" });
    }
  }

  return app(req, res);
};
