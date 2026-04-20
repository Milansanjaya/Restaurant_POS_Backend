import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import http from "http";
import { connectDatabase } from "./config/database";
import { seedPermissions, seedRoles } from "./shared/seedPermissions";
import { assignAdminPermissions } from "./shared/assignAdminPermissions";
import { initSocket } from "./infrastructure/socket";
import { startShiftAutoCloseScheduler } from "./shared/shiftAutoClose";

const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET not defined in environment variables");
  process.exit(1);
}

const startServer = async () => {
  try {
    await connectDatabase();
    await seedPermissions();
    await seedRoles();
    await assignAdminPermissions();

    startShiftAutoCloseScheduler();

    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();