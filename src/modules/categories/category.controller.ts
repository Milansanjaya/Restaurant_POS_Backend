import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware";
import Category from "./category.model";

export class CategoryController {
  // Create category
  async createCategory(req: AuthRequest, res: Response) {
    try {
      const { name, description, parentId, icon, image, displayOrder } = req.body;
      const branch_id = req.body.branch_id;

      // Prefer JWT user; keep req.body.userId as backwards-compatible fallback
      const createdBy = req.user?._id ?? req.body.userId;
      if (!createdBy) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
      }

      // Calculate level
      let level = 0;
      if (parentId) {
        const parent = await Category.findOne({ _id: parentId, branch_id });
        if (!parent) {
          return res.status(400).json({
            success: false,
            message: "Invalid parent category"
          });
        }
        level = parent.level + 1;
      }

      const category = new Category({
        name,
        description,
        parentId,
        level,
        icon,
        image,
        displayOrder: displayOrder || 0,
        branch_id,
        createdBy
      });

      await category.save();

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category
      });
    } catch (error: any) {
      const status = error?.name === "ValidationError" ? 400 : 500;
      res.status(status).json({
        success: false,
        message: "Error creating category",
        error: error.message
      });
    }
  }

  // Get all categories (tree structure)
  async getAllCategories(req: AuthRequest, res: Response) {
    try {
      const branch_id = req.body.branch_id;
      const { isActive } = req.query;

      const query: any = { branch_id };
      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }

      const categories = await Category.find(query)
        .sort({ displayOrder: 1, name: 1 });

      const getParentIdValue = (cat: any) => {
        const p = cat.parentId;
        return p && typeof p === "object" && p._id ? p._id : p;
      };

      // Build tree structure
      const buildTree = (parentId: any = null) => {
        return categories
          .filter(cat => {
            const p = getParentIdValue(cat);
            if (parentId === null) return p === null || p === undefined;
            return p?.toString() === parentId.toString();
          })
          .map(cat => ({
            ...cat.toObject(),
            children: buildTree(cat._id)
          }));
      };

      const tree = buildTree();

      res.status(200).json({
        success: true,
        data: tree
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching categories",
        error: error.message
      });
    }
  }

  // Get category by ID
  async getCategoryById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const branch_id = req.body.branch_id;

      const category = await Category.findOne({ _id: id, branch_id })
        .populate('parentId', 'name');

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found"
        });
      }

      res.status(200).json({
        success: true,
        data: category
      });
    } catch (error: any) {
      const status = error?.name === "CastError" ? 400 : 500;
      res.status(status).json({
        success: false,
        message: status === 400 ? "Invalid category id" : "Error fetching category",
        error: error.message
      });
    }
  }

  // Update category
  async updateCategory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const branch_id = req.body.branch_id;
      const updateData = req.body;

      delete updateData.branch_id;
      delete updateData.userId;

      const category = await Category.findOneAndUpdate(
        { _id: id, branch_id },
        updateData,
        { new: true }
      );

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Category updated successfully",
        data: category
      });
    } catch (error: any) {
      const status = error?.name === "CastError" ? 400 : 500;
      res.status(status).json({
        success: false,
        message: status === 400 ? "Invalid category id" : "Error updating category",
        error: error.message
      });
    }
  }

  // Delete category
  async deleteCategory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const branch_id = req.body.branch_id;

      // Check if has children
      const hasChildren = await Category.countDocuments({ parentId: id, branch_id });
      if (hasChildren > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete category with subcategories"
        });
      }

      const category = await Category.findOneAndUpdate(
        { _id: id, branch_id },
        { isActive: false },
        { new: true }
      );

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Category deleted successfully"
      });
    } catch (error: any) {
      const status = error?.name === "CastError" ? 400 : 500;
      res.status(status).json({
        success: false,
        message: status === 400 ? "Invalid category id" : "Error deleting category",
        error: error.message
      });
    }
  }
}

export default new CategoryController();
