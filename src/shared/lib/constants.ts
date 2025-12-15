// BLE Service & Characteristic UUIDs
export const BLE_SERVICE_UUID = '12345678-1234-1234-1234-1234567890a1';
export const BLE_WRITE_CHAR_UUID = '12345678-1234-1234-1234-1234567890a2';
export const BLE_NOTIFY_CHAR_UUID = '12345678-1234-1234-1234-1234567890a3';

// BLE Commands
export const BLE_COMMAND_PRINT = 'PRINT';
export const BLE_RESPONSE_DONE = 'DONE';

// Coupon Validation Status
export const COUPON_STATUS = {
  INVALID: 'INVALID',
  ALREADY_USED: 'ALREADY_USED',
  VALID_AND_REDEEMED: 'VALID_AND_REDEEMED',
} as const;

export type CouponStatus = (typeof COUPON_STATUS)[keyof typeof COUPON_STATUS];

// Barcode Scanner Config
export const BARCODE_INPUT_TIMEOUT_MS = 50;
export const BARCODE_MIN_LENGTH = 8;
