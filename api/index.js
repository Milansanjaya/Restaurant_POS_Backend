const app = require("../dist/app.js").default;
const { connectDatabase } = require("../dist/config/database.js");
const { seedPermissions, seedRoles } = require("../dist/shared/seedPermissions.js");
const { assignAdminPermissions } = require("../dist/shared/assignAdminPermissions.js");

let isConnected = false;

module.exports = async (req, res) => {
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
