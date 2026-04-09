import mongoose from "mongoose";
import Permission from "../modules/roles/permission.model";
import Role from "../modules/roles/role.model";

// Keep this list in sync with permission strings used by authorize("...") in routes.
export const seedPermissions = async () => {
  const permissions = [
    // Dashboard
    { name: "VIEW_DASHBOARD", description: "View dashboard and statistics" },
    
    // Products
    { name: "VIEW_PRODUCTS", description: "View products list" },
    { name: "CREATE_PRODUCT", description: "Create new products" },
    { name: "EDIT_PRODUCT", description: "Edit existing products" },
    { name: "DELETE_PRODUCT", description: "Delete products" },
    
    // Categories
    { name: "VIEW_CATEGORIES", description: "View categories" },
    { name: "CREATE_CATEGORY", description: "Create categories" },
    { name: "EDIT_CATEGORY", description: "Edit categories" },
    { name: "DELETE_CATEGORY", description: "Delete categories" },
    
    // Inventory
    { name: "VIEW_INVENTORY", description: "View inventory levels" },
    { name: "ADJUST_INVENTORY", description: "Adjust inventory quantities" },
    
    // Sales / POS
    { name: "CREATE_SALE", description: "Create sales transactions" },
    { name: "VOID_SALE", description: "Void/cancel sales" },
    { name: "APPLY_DISCOUNT", description: "Apply discounts to sales" },
    { name: "VIEW_SALES", description: "View sales history" },
    
    // Tables
    { name: "VIEW_TABLES", description: "View restaurant tables" },
    { name: "MANAGE_TABLES", description: "Create/edit/delete tables" },
    { name: "TRANSFER_TABLE", description: "Transfer orders between tables" },
    
    // Kitchen
    { name: "VIEW_KITCHEN", description: "View kitchen orders" },
    { name: "UPDATE_KITCHEN_STATUS", description: "Update order cooking status" },
    
    // Reservations
    { name: "VIEW_RESERVATIONS", description: "View reservations" },
    { name: "CREATE_RESERVATION", description: "Create reservations" },
    { name: "MANAGE_RESERVATIONS", description: "Edit/cancel reservations" },
    
    // Shifts
    { name: "VIEW_SHIFTS", description: "View shift information" },
    { name: "MANAGE_SHIFTS", description: "Open/close shifts" },
    
    // Customers
    { name: "VIEW_CUSTOMERS", description: "View customer list" },
    { name: "CREATE_CUSTOMER", description: "Create customers" },
    { name: "EDIT_CUSTOMER", description: "Edit customers" },
    { name: "DELETE_CUSTOMER", description: "Delete customers" },
    
    // Loyalty
    { name: "VIEW_LOYALTY", description: "View loyalty points" },
    { name: "MANAGE_LOYALTY", description: "Add/deduct loyalty points" },
    
    // Suppliers
    { name: "VIEW_SUPPLIERS", description: "View suppliers" },
    { name: "CREATE_SUPPLIER", description: "Create suppliers" },
    { name: "EDIT_SUPPLIER", description: "Edit suppliers" },
    { name: "DELETE_SUPPLIER", description: "Delete suppliers" },
    { name: "RECORD_PAYMENT", description: "Record supplier payments" },
    
    // Purchase Orders
    { name: "VIEW_PURCHASE_ORDERS", description: "View purchase orders" },
    { name: "CREATE_PURCHASE_ORDER", description: "Create purchase orders" },
    { name: "APPROVE_PURCHASE_ORDER", description: "Approve purchase orders" },
    { name: "DELETE_PURCHASE_ORDER", description: "Delete purchase orders" },
    
    // GRN (Goods Received Note)
    { name: "VIEW_GRN", description: "View GRN records" },
    { name: "CREATE_GRN", description: "Create GRN" },
    { name: "APPROVE_GRN", description: "Approve GRN and update inventory" },
    
    // Batches
    { name: "VIEW_BATCHES", description: "View product batches" },
    { name: "MANAGE_BATCHES", description: "Create/edit batches" },
    
    // Coupons
    { name: "VIEW_COUPONS", description: "View coupons" },
    { name: "CREATE_COUPON", description: "Create coupons" },
    { name: "EDIT_COUPON", description: "Edit coupons" },
    { name: "DELETE_COUPON", description: "Delete coupons" },
    
    // Returns
    { name: "VIEW_RETURNS", description: "View sales returns" },
    { name: "CREATE_RETURN", description: "Process returns" },
    
    // Reports
    { name: "VIEW_REPORTS", description: "View all reports" },
    { name: "EXPORT_REPORTS", description: "Export reports" },
    
    // Settings
    { name: "VIEW_SETTINGS", description: "View system settings" },
    { name: "MANAGE_SETTINGS", description: "Edit system settings" },
    
    // Units
    { name: "VIEW_UNITS", description: "View measurement units" },
    { name: "MANAGE_UNITS", description: "Create/edit units" },
    
    // Users & Roles
    { name: "VIEW_USERS", description: "View users" },
    { name: "CREATE_USER", description: "Create users" },
    { name: "EDIT_USER", description: "Edit users" },
    { name: "DELETE_USER", description: "Delete users" },
    { name: "MANAGE_ROLES", description: "Manage roles and permissions" },
  ];

  console.log("🌱 Seeding permissions...");
  
  for (const perm of permissions) {
    const exists = await Permission.findOne({ name: perm.name });
    if (!exists) {
      await Permission.create(perm);
      console.log(`✅ Permission created: ${perm.name}`);
    }
  }

  console.log("✨ Permissions seeding completed!");
};

export const seedRoles = async () => {
  console.log("🌱 Seeding roles...");

  // Get all permissions
  const allPermissions = await Permission.find();
  const permissionMap = new Map(allPermissions.map(p => [p.name, p._id]));

  // Define roles with their permissions
  const roles = [
    {
      name: "SUPER_ADMIN",
      description: "Full system access",
      permissions: allPermissions.map(p => p._id), // All permissions
    },
    {
      name: "ADMIN",
      description: "Administrative access",
      permissions: allPermissions
        .filter(p => !p.name.includes("MANAGE_ROLES")) // All except role management
        .map(p => p._id),
    },
    {
      name: "MANAGER",
      description: "Restaurant manager",
      permissions: [
        "VIEW_DASHBOARD",
        "VIEW_PRODUCTS", "CREATE_PRODUCT", "EDIT_PRODUCT",
        "VIEW_CATEGORIES", "CREATE_CATEGORY", "EDIT_CATEGORY", "DELETE_CATEGORY",
        "VIEW_INVENTORY", "ADJUST_INVENTORY",
        "CREATE_SALE", "VOID_SALE", "APPLY_DISCOUNT", "VIEW_SALES",
        "VIEW_TABLES", "MANAGE_TABLES", "TRANSFER_TABLE",
        "VIEW_KITCHEN",
        "VIEW_RESERVATIONS", "CREATE_RESERVATION", "MANAGE_RESERVATIONS",
        "VIEW_SHIFTS", "MANAGE_SHIFTS",
        "VIEW_CUSTOMERS", "CREATE_CUSTOMER", "EDIT_CUSTOMER",
        "VIEW_LOYALTY", "MANAGE_LOYALTY",
        "VIEW_SUPPLIERS", "CREATE_SUPPLIER", "EDIT_SUPPLIER",
        "VIEW_PURCHASE_ORDERS", "CREATE_PURCHASE_ORDER", "APPROVE_PURCHASE_ORDER",
        "VIEW_GRN", "CREATE_GRN", "APPROVE_GRN",
        "VIEW_BATCHES",
        "VIEW_COUPONS", "CREATE_COUPON", "EDIT_COUPON",
        "VIEW_RETURNS", "CREATE_RETURN",
        "VIEW_REPORTS", "EXPORT_REPORTS",
        "VIEW_UNITS",
      ].map(name => permissionMap.get(name)).filter(Boolean),
    },
    {
      name: "CASHIER",
      description: "Cashier/POS operator",
      permissions: [
        "VIEW_DASHBOARD",
        "CREATE_SALE", "VIEW_SALES",
        "VIEW_PRODUCTS",
        "VIEW_CATEGORIES",
        "VIEW_CUSTOMERS", "CREATE_CUSTOMER",
        "VIEW_LOYALTY",
        "VIEW_TABLES",
        "VIEW_SHIFTS", "MANAGE_SHIFTS",
        "VIEW_COUPONS",
        "CREATE_RETURN",
      ].map(name => permissionMap.get(name)).filter(Boolean),
    },
    {
      name: "COOK",
      description: "Kitchen staff",
      permissions: [
        "VIEW_KITCHEN", "UPDATE_KITCHEN_STATUS",
        "VIEW_TABLES",
      ].map(name => permissionMap.get(name)).filter((p): p is mongoose.Types.ObjectId => p !== undefined),
    },
  ];

  for (const roleData of roles) {
    const exists = await Role.findOne({ name: roleData.name });
    if (!exists) {
      await Role.create(roleData as any);
      console.log(`✅ Role created: ${roleData.name} with ${roleData.permissions.length} permissions`);
    } else {
      // Update existing role permissions
      exists.permissions = roleData.permissions as any;
      await exists.save();
      console.log(`🔄 Role updated: ${roleData.name} with ${roleData.permissions.length} permissions`);
    }
  }

  console.log("✨ Roles seeding completed!");
};