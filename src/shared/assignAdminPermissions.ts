import Role from "../modules/roles/role.model";
import Permission from "../modules/roles/permission.model";

export const assignAdminPermissions = async () => {
  const allPermissions = await Permission.find();
  const permissionIds = allPermissions.map((p) => p._id);

  let adminRole = await Role.findOne({ name: "SUPER_ADMIN" });

  if (!adminRole) {
    adminRole = await Role.create({ name: "SUPER_ADMIN", permissions: permissionIds });
    console.log("SUPER_ADMIN role created and permissions assigned");
    return;
  }

  adminRole.permissions = permissionIds;
  await adminRole.save();
  console.log("All permissions assigned to SUPER_ADMIN");
};