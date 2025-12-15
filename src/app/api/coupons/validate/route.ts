import { NextRequest, NextResponse } from 'next/server';
import { COUPON_STATUS } from '@shared/lib';
import { connectDB } from '@shared/lib/mongodb';
import { Coupon } from '@entities/coupon';

interface ValidateRequest {
  couponNumber: string;
}

interface ValidateResponse {
  status: (typeof COUPON_STATUS)[keyof typeof COUPON_STATUS];
  redeemedAt?: string;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body: ValidateRequest = await request.json();
    const { couponNumber } = body;

    if (!couponNumber || typeof couponNumber !== 'string') {
      return NextResponse.json(
        { status: COUPON_STATUS.INVALID },
        { status: 400 }
      );
    }

    const normalizedCode = couponNumber.trim();

    // 원자적 업데이트: isUsed=false인 쿠폰을 찾아서 isUsed=true로 변경
    const updatedCoupon = await Coupon.findOneAndUpdate(
      { couponNumber: normalizedCode, isUsed: false },
      { $set: { isUsed: true, usedAt: new Date() } },
      { new: true }
    );

    if (updatedCoupon) {
      const response: ValidateResponse = {
        status: COUPON_STATUS.VALID_AND_REDEEMED,
        redeemedAt: updatedCoupon.usedAt?.toISOString(),
      };
      return NextResponse.json(response);
    }

    // 업데이트 실패 시: 쿠폰이 없는지, 이미 사용된 건지 확인
    const existingCoupon = await Coupon.findOne({ couponNumber: normalizedCode });

    if (!existingCoupon) {
      return NextResponse.json({ status: COUPON_STATUS.INVALID });
    }

    if (existingCoupon.isUsed) {
      return NextResponse.json({ status: COUPON_STATUS.ALREADY_USED });
    }

    // 이 경우는 이론적으로 발생하면 안 됨 (race condition)
    return NextResponse.json({ status: COUPON_STATUS.INVALID });
  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
