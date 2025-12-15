import { COUPON_STATUS } from '../lib/constants';

export type CouponStatus = (typeof COUPON_STATUS)[keyof typeof COUPON_STATUS];

export interface ValidateResponse {
  status: CouponStatus;
  redeemedAt?: string;
  error?: string;
}

export type ScanTab = 'barcode' | 'camera';

export type TriggerStatus = 'idle' | 'sending' | 'success' | 'failed';

export interface ScanResult {
  code: string;
  status: CouponStatus | null;
  triggerStatus: TriggerStatus;
  timestamp: Date;
}
