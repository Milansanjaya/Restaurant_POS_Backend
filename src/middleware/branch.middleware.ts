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

  // Some requests (GET/DELETE) may not have a parsed body.
  // Ensure we always have an object so controllers can read branch_id consistently.
  (req as any).body = (req as any).body ?? {};
  (req as any).body.branch_id = req.user.branch_id;

  next();
};