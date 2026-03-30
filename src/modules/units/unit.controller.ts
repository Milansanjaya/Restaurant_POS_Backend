import { Request, Response } from "express";
import Unit from "./unit.model";

export class UnitController {
  // Create unit
  async createUnit(req: Request, res: Response) {
    try {
      const { name, shortCode, type, baseUnit, conversionFactor } = req.body;
      const userId = req.body.userId;

      const unit = new Unit({
        name,
        shortCode,
        type,
        baseUnit,
        conversionFactor: conversionFactor || 1,
        createdBy: userId
      });

      await unit.save();

      res.status(201).json({
        success: true,
        message: "Unit created successfully",
        data: unit
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error creating unit",
        error: error.message
      });
    }
  }

  // Get all units
  async getAllUnits(req: Request, res: Response) {
    try {
      const { type, isActive } = req.query;

      const query: any = {};
      if (type) query.type = type;
      if (isActive !== undefined) query.isActive = isActive === 'true';

      const units = await Unit.find(query)
        .populate('baseUnit', 'name shortCode')
        .sort({ type: 1, name: 1 });

      res.status(200).json({
        success: true,
        data: units
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching units",
        error: error.message
      });
    }
  }

  // Get unit by ID
  async getUnitById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const unit = await Unit.findById(id)
        .populate('baseUnit', 'name shortCode conversionFactor');

      if (!unit) {
        return res.status(404).json({
          success: false,
          message: "Unit not found"
        });
      }

      res.status(200).json({
        success: true,
        data: unit
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching unit",
        error: error.message
      });
    }
  }

  // Update unit
  async updateUnit(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      delete updateData.userId;

      const unit = await Unit.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      if (!unit) {
        return res.status(404).json({
          success: false,
          message: "Unit not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Unit updated successfully",
        data: unit
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error updating unit",
        error: error.message
      });
    }
  }

  // Delete unit
  async deleteUnit(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const unit = await Unit.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );

      if (!unit) {
        return res.status(404).json({
          success: false,
          message: "Unit not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Unit deleted successfully"
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error deleting unit",
        error: error.message
      });
    }
  }
}

export default new UnitController();
