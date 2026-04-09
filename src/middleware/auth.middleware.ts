import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../modules/users/user.model";

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token not found" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET not configured" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

    if (!decoded?.userId) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const user = await User.findById(decoded.userId).populate({
      path: "role",
      populate: {
        path: "permissions",
        model: "Permission"
      }
    });

    if (!user || user.isActive === false) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = user;

    next();
  } catch (error: any) {
    console.error("AUTH ERROR:", error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};