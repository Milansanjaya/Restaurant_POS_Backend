import { Request, Response } from "express";
import SystemConfig from "./systemConfig.model";
import DailyReceiptCounter from "../sales/dailyReceiptCounter.model";

const getLocalDayKey = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

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
      } else {
        // Backfill defaults for newly added fields (keeps DB consistent)
        const cfgAny = config as any;
        if (typeof cfgAny.dailyReceiptNumberLimit !== 'number' || cfgAny.dailyReceiptNumberLimit < 1) {
          cfgAny.dailyReceiptNumberLimit = 1500;
          await config.save();
        }
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

  // Read-only preview: next daily receipt/bill number (does NOT increment)
  async getReceiptPreview(req: Request, res: Response) {
    try {
      const branch_id = req.body.branch_id;
      if (!branch_id) {
        return res.status(400).json({
          success: false,
          message: "branch_id is required"
        });
      }

      let config = await SystemConfig.findOne({ branch_id });
      if (!config) {
        config = new SystemConfig({ branch_id });
        await config.save();
      }

      const cfgAny = config as any;
      const limitRaw = cfgAny.dailyReceiptNumberLimit;
      const limit =
        Number.isFinite(Number(limitRaw)) && Number(limitRaw) >= 1
          ? Math.min(100000, Math.floor(Number(limitRaw)))
          : 1500;

      const day = getLocalDayKey(new Date());
      const counter = await DailyReceiptCounter.findOne({ branch_id, day });
      const lastIssued = Math.max(0, Number(counter?.seq ?? 0) || 0);
      const reached = lastIssued >= limit;
      const next = reached ? null : lastIssued + 1;

      return res.status(200).json({
        success: true,
        data: {
          day,
          lastIssued,
          next,
          limit,
          reached
        }
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Error fetching receipt preview",
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

      if (Object.prototype.hasOwnProperty.call(updateData, 'dailyReceiptNumberLimit')) {
        const raw = (updateData as any).dailyReceiptNumberLimit;
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 1) {
          return res.status(400).json({
            success: false,
            message: "dailyReceiptNumberLimit must be a number >= 1"
          });
        }
        // Keep within a sane upper bound to avoid accidental huge values
        (updateData as any).dailyReceiptNumberLimit = Math.min(100000, Math.floor(n));
      }

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
