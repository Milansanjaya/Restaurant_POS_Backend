import Role from "../modules/roles/role.model";
import Permission from "../modules/roles/permission.model";

export const assignAdminPermissions = async () => {
  const adminRole = await Role.findOne({ name: "SUPER_ADMIN" });
  const allPermissions = await Permission.find();

  if (adminRole) {
    adminRole.permissions = allPermissions.map(p => p._id);
    await adminRole.save();
    console.log("All permissions assigned to SUPER_ADMIN");
  }
};