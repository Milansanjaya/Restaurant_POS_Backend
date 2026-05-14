import { Router } from "express";
import { registerAdmin, login, getMe, demoLogin } from "./auth.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/permission.middleware";

const router = Router();

router.post("/register-admin", registerAdmin);
router.post("/login", login);
router.post("/demo-login", demoLogin);
router.get("/me", authenticate, getMe);

router.get(
  "/test-permission",
  authenticate,
  authorize("CREATE_PRODUCT"),
  (req, res) => {
    res.json({ message: "Permission allowed" });
  }
);


router.get("/protected", authenticate, (req, res) => {
  res.json({ message: "Access granted", user: (req as any).user });



});

export default router;