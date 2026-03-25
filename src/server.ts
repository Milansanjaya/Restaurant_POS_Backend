import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import http from "http";
import { connectDatabase } from "./config/database";
import { seedPermissions } from "./shared/seedPermissions";
import { assignAdminPermissions } from "./shared/assignAdminPermissions";
import { initSocket } from "./infrastructure/socket";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDatabase();
    await seedPermissions();
    await assignAdminPermissions();

     const server = http.createServer(app);

    initSocket(server);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();