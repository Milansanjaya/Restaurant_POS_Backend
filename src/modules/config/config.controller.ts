import { Request, Response } from "express";
import SystemConfig from "./systemConfig.model";

export class ConfigController {
  // Get configuration
  async getConfig(req: Request, res: Response) {
    try {
      const branch_id = req.body.branch_id;

      let config = await SystemConfig.findOne({ branch_id });

      if (!config) {
        // Create default config
        config = new SystemConfig({ branch_id });
        await config.save();
      }

      res.status(200).json({
        success: true,
        data: config
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching configuration",
        error: error.message
      });
    }
  }

  // Update configuration
  async updateConfig(req: Request, res: Response) {
    try {
      const branch_id = req.body.branch_id;
      const updateData = req.body;

      delete updateData.branch_id;
      delete updateData.userId;

      let config = await SystemConfig.findOne({ branch_id });

      if (!config) {
        config = new SystemConfig({ branch_id, ...updateData });
      } else {
        Object.assign(config, updateData);
      }

      await config.save();

      res.status(200).json({
        success: true,
        message: "Configuration updated successfully",
        data: config
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error updating configuration",
        error: error.message
      });
    }
  }

  // Update tax settings
  async updateTaxSettings(req: Request, res: Response) {
    try {
      const branch_id = req.body.branch_id;
      const { taxes } = req.body;

      let config = await SystemConfig.findOne({ branch_id });

      if (!config) {
        config = new SystemConfig({ branch_id });
      }

      config.taxes = taxes;
      await config.save();

      res.status(200).json({
        success: true,
        message: "Tax settings updated successfully",
        data: config.taxes
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error updating tax settings",
        error: error.message
      });
    }
  }

  // Upload logo
  async uploadLogo(req: Request, res: Response) {
    try {
      const branch_id = req.body.branch_id;
      const { logo } = req.body;

      let config = await SystemConfig.findOne({ branch_id });

      if (!config) {
        config = new SystemConfig({ branch_id });
      }

      config.logo = logo;
      await config.save();

      res.status(200).json({
        success: true,
        message: "Logo uploaded successfully",
        data: { logo: config.logo }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error uploading logo",
        error: error.message
      });
    }
  }
}

export default new ConfigController();
