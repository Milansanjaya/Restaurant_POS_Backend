import dotenv from "dotenv";
dotenv.config();

import { connectDatabase } from "./src/config/database";
import { seedPermissions, seedRoles } from "./src/shared/seedPermissions";

const runSeed = async () => {
  try {
    console.log("Connecting to database...");
    await connectDatabase();
    
    console.log("\n========================================");
    await seedPermissions();
    
    console.log("\n========================================");
    await seedRoles();
    
    console.log("\n========================================");
    console.log("✅ Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

runSeed();
