"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const database_1 = require("./src/config/database");
const seedPermissions_1 = require("./src/shared/seedPermissions");
const runSeed = async () => {
    try {
        console.log("Connecting to database...");
        await (0, database_1.connectDatabase)();
        console.log("\n========================================");
        await (0, seedPermissions_1.seedPermissions)();
        console.log("\n========================================");
        await (0, seedPermissions_1.seedRoles)();
        console.log("\n========================================");
        console.log("✅ Seeding completed successfully!");
        process.exit(0);
    }
    catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
};
runSeed();
//# sourceMappingURL=seed-script.js.map