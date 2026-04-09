import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const authorize = (requiredPermission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const permissions = (user.role?.permissions || []).map((p: any) => p.name);

    if (!permissions.includes(requiredPermission)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};