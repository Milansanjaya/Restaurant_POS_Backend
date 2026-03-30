import Permission from "../modules/roles/permission.model";

// Keep this list in sync with permission strings used by authorize("...") in routes.
export const seedPermissions = async () => {
  const permissions = [
    // Products / Inventory
    "CREATE_PRODUCT",
    "EDIT_PRODUCT",
    "DELETE_PRODUCT",

    // Sales / Reservations
    "CREATE_SALE",
    "VOID_SALE",
    "APPLY_DISCOUNT",

    // Reports / Dashboard / Common views
    "VIEW_REPORTS",

    // Tables
    "TRANSFER_TABLE",

    // Suppliers
    "CREATE_SUPPLIER",
    "VIEW_SUPPLIER",
    "EDIT_SUPPLIER",
    "DELETE_SUPPLIER",
    "RECORD_PAYMENT",

    // Purchase Orders
    "CREATE_PURCHASE_ORDER",
    "VIEW_PURCHASE_ORDER",
    "APPROVE_PURCHASE_ORDER",
    "DELETE_PURCHASE_ORDER",

    // GRN
    "CREATE_GRN",
    "VIEW_GRN",
    "APPROVE_GRN"
  ];

  for (const perm of permissions) {
    const exists = await Permission.findOne({ name: perm });
    if (!exists) {
      await Permission.create({ name: perm });
      console.log(`Permission created: ${perm}`);
    }
  }
};