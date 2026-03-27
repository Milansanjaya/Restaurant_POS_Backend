import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const enforceBranch = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  req.body.branch_id = req.user.branch_id;

  next();
};