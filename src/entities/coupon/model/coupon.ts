import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICoupon extends Document {
  no: number;
  couponNumber: string;
  isUsed: boolean;
  usedAt?: Date;
  usedBy?: string;
}

const couponSchema = new Schema<ICoupon>(
  {
    no: {
      type: Number,
      required: true,
    },
    couponNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
    },
    usedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const Coupon: Model<ICoupon> =
  mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', couponSchema);
