import Permission from "../modules/roles/permission.model";

export const seedPermissions = async () => {
  const permissions = [
    "CREATE_PRODUCT",
    "EDIT_PRODUCT",
    "DELETE_PRODUCT",
    "CREATE_SALE",
    "VOID_SALE",
    "APPLY_DISCOUNT",
    "VIEW_REPORTS",
    "TRANSFER_TABLE"
  ];

  for (const perm of permissions) {
    const exists = await Permission.findOne({ name: perm });
    if (!exists) {
      await Permission.create({ name: perm });
      console.log(`Permission created: ${perm}`);
    }
  }
};