'use client';

import { COUPON_STATUS } from '../lib';
import type { CouponStatus, TriggerStatus } from '../types';

interface StatusBadgeProps {
  couponStatus: CouponStatus | null;
  triggerStatus: TriggerStatus;
}

export function StatusBadge({ couponStatus, triggerStatus }: StatusBadgeProps) {
  if (!couponStatus) {
    return (
      <div className="text-center animate-fade-in">
        <p className="text-6xl font-black bg-gradient-to-r from-sky-400 via-blue-500 to-purple-500 bg-clip-text text-transparent animate-pulse mb-4">
          바코드를 스캔해주세요!
        </p>
        <p className="text-2xl text-sky-600 animate-bounce">
          카메라에 바코드를 비춰주세요 📷
        </p>
      </div>
    );
  }

  if (couponStatus === COUPON_STATUS.INVALID) {
    return (
      <div className="text-center animate-shake relative">
        <p className="text-6xl font-black bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 bg-clip-text text-transparent mb-4">
          앗! 확인이 필요해요 😅
        </p>
        <p className="text-2xl text-rose-500">유효하지 않은 바코드예요</p>
        <span className="absolute bottom-0 right-0 text-sm text-rose-400/60 font-mono">E001</span>
      </div>
    );
  }

  if (couponStatus === COUPON_STATUS.ALREADY_USED) {
    return (
      <div className="text-center animate-shake relative">
        <p className="text-6xl font-black bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent mb-4">
          이미 사용했어요! 🎫
        </p>
        <p className="text-2xl text-amber-500">이 바코드는 이미 사용된 바코드예요</p>
        <span className="absolute bottom-0 right-0 text-sm text-amber-400/60 font-mono">E002</span>
      </div>
    );
  }

  if (couponStatus === COUPON_STATUS.VALID_AND_REDEEMED) {
    const triggerMessages: Record<TriggerStatus, {
      gradient: string;
      subColor: string;
      title: string;
      subtitle: string;
      animation: string;
      code?: string;
    }> = {
      idle: {
        gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
        subColor: 'text-emerald-600',
        title: '확인 완료! ✨',
        subtitle: '잠시만 기다려주세요',
        animation: 'animate-pulse'
      },
      sending: {
        gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
        subColor: 'text-violet-600',
        title: '카드 출력 중... 🎴',
        subtitle: '조금만 기다려주세요!',
        animation: 'animate-spin-slow'
      },
      success: {
        gradient: 'from-pink-500 via-rose-500 to-red-400',
        subColor: 'text-pink-600',
        title: '포토카드 발급 완료! 🎉',
        subtitle: '아래에서 카드를 받아가세요',
        animation: 'animate-bounce'
      },
      failed: {
        gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
        subColor: 'text-emerald-600',
        title: '바코드 확인 완료! ✅',
        subtitle: 'ESP32 연결 후 다시 스캔해주세요',
        animation: '',
        code: 'E003'
      },
    };

    const { gradient, subColor, title, subtitle, animation, code } = triggerMessages[triggerStatus];

    return (
      <div className="text-center animate-fade-in relative">
        <p className={`text-5xl font-black bg-gradient-to-r ${gradient} bg-clip-text text-transparent mb-4 ${animation}`}>
          {title}
        </p>
        <p className={`text-2xl ${subColor}`}>{subtitle}</p>
        {code && <span className={`absolute bottom-0 right-0 text-sm ${subColor}/60 font-mono`}>{code}</span>}
      </div>
    );
  }

  return null;
}
