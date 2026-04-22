import mongoose, { Schema, Document } from "mongoose";

interface ITaxSettings {
  name: string;
  rate: number;
  isDefault: boolean;
  type: 'INCLUSIVE' | 'EXCLUSIVE';
}

interface ICurrencySettings {
  code: string;
  symbol: string;
  position: 'BEFORE' | 'AFTER';
}

interface IInvoiceFormat {
  prefix: string;
  numberLength: number;
  footer: string;
}

export interface ISystemConfig extends Document {
  company_id?: mongoose.Types.ObjectId;
  branch_id?: string;
  taxes: ITaxSettings[];
  currency: ICurrencySettings;
  expiryAlertDays: number;
  invoiceFormat: IInvoiceFormat;
  serviceCharge: number;
  serviceChargeType: 'FIXED' | 'PERCENTAGE';
  packagingCharge: number;
  packagingChargeType: 'FIXED' | 'PERCENTAGE';
  logo?: string;
  emailTemplates: Map<string, string>;
  smsTemplates: Map<string, string>;
  pointsPerDollar: number;
  pointsExpiryDays: number;
  pointsMultiplierByTier?: {
    BASIC?: number;
    SILVER?: number;
    GOLD?: number;
    PLATINUM?: number;
  };
}

const SystemConfigSchema = new Schema<ISystemConfig>(
  {
    company_id: { type: Schema.Types.ObjectId, ref: "Company" },
    branch_id: { type: String },
    taxes: [{
      name: { type: String, required: true },
      rate: { type: Number, required: true },
      isDefault: { type: Boolean, default: false },
      type: { type: String, enum: ['INCLUSIVE', 'EXCLUSIVE'], default: 'EXCLUSIVE' }
    }],
    currency: {
      code: { type: String, default: 'USD' },
      symbol: { type: String, default: '$' },
      position: { type: String, enum: ['BEFORE', 'AFTER'], default: 'BEFORE' }
    },
    expiryAlertDays: { type: Number, default: 30 },
    invoiceFormat: {
      prefix: { type: String, default: 'INV' },
      numberLength: { type: Number, default: 6 },
      footer: { type: String, default: 'Thank you for your business!' }
    },
    serviceCharge: { type: Number, default: 0 },
    serviceChargeType: { type: String, enum: ['FIXED', 'PERCENTAGE'], default: 'PERCENTAGE' },
    packagingCharge: { type: Number, default: 0 },
    packagingChargeType: { type: String, enum: ['FIXED', 'PERCENTAGE'], default: 'PERCENTAGE' },
    logo: { type: String },
    emailTemplates: { type: Map, of: String, default: {} },
    smsTemplates: { type: Map, of: String, default: {} },
    pointsPerDollar: { type: Number, default: 0.1 },
    pointsExpiryDays: { type: Number, default: 365 },
    pointsMultiplierByTier: {
      BASIC: { type: Number, default: 1 },
      SILVER: { type: Number, default: 1 },
      GOLD: { type: Number, default: 1 },
      PLATINUM: { type: Number, default: 1 },
    },
  },
  { timestamps: true }
);

SystemConfigSchema.index({ branch_id: 1 });
SystemConfigSchema.index({ company_id: 1 });

export default mongoose.model<ISystemConfig>("SystemConfig", SystemConfigSchema);
