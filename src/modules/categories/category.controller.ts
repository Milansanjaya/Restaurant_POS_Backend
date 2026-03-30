import { Request, Response } from "express";
import Category from "./category.model";

export class CategoryController {
  // Create category
  async createCategory(req: Request, res: Response) {
    try {
      const { name, description, parentId, icon, image, displayOrder } = req.body;
      const branch_id = req.body.branch_id;
      const userId = req.body.userId;

      // Calculate level
      let level = 0;
      if (parentId) {
        const parent = await Category.findById(parentId);
        if (parent) {
          level = parent.level + 1;
        }
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
        createdBy: userId
      });

      await category.save();

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error creating category",
        error: error.message
      });
    }
  }

  // Get all categories (tree structure)
  async getAllCategories(req: Request, res: Response) {
    try {
      const branch_id = req.body.branch_id;
      const { isActive } = req.query;

      const query: any = { branch_id };
      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }

      const categories = await Category.find(query)
        .populate('parentId', 'name')
        .sort({ displayOrder: 1, name: 1 });

      // Build tree structure
      const buildTree = (parentId: any = null) => {
        return categories
          .filter(cat => {
            if (parentId === null) {
              return cat.parentId === null || cat.parentId === undefined;
            }
            return cat.parentId?.toString() === parentId.toString();
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
  async getCategoryById(req: Request, res: Response) {
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
      res.status(500).json({
        success: false,
        message: "Error fetching category",
        error: error.message
      });
    }
  }

  // Update category
  async updateCategory(req: Request, res: Response) {
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
      res.status(500).json({
        success: false,
        message: "Error updating category",
        error: error.message
      });
    }
  }

  // Delete category
  async deleteCategory(req: Request, res: Response) {
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
      res.status(500).json({
        success: false,
        message: "Error deleting category",
        error: error.message
      });
    }
  }
}

export default new CategoryController();
