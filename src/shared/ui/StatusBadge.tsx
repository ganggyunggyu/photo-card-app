'use client';

import { useMemo, useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { COUPON_STATUS } from '../lib';
import type { CouponStatus, TriggerStatus } from '../types';

const LOTTIE_URLS = {
  success: 'https://assets-v2.lottiefiles.com/a/3e01ae6c-1163-11ee-beac-afbaeebb6134/amSwsW7OaV.json',
  sad: 'https://assets-v2.lottiefiles.com/a/c2ecaa9c-1167-11ee-befe-b317925a927a/4vaLjAcCVi.json',
  warning: 'https://assets9.lottiefiles.com/packages/lf20_Tkwjw8.json',
  loading: 'https://assets1.lottiefiles.com/packages/lf20_poqmycwy.json',
};

interface StatusBadgeProps {
  couponStatus: CouponStatus | null;
  triggerStatus: TriggerStatus;
}

function LottieAnimation({ url, loop = true }: { url: string; loop?: boolean }) {
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(setAnimationData)
      .catch(() => setHasError(true));
  }, [url]);

  if (hasError || !animationData) {
    return <div className="w-full aspect-square rounded-full bg-gray-100 animate-pulse" />;
  }

  return (
    <Lottie
      animationData={animationData}
      loop={loop}
      autoplay={true}
      className="w-full h-full"
    />
  );
}

interface StatusConfig {
  lottieUrl: string;
  lottieLoop: boolean;
  accentColor: string;
  bgColor: string;
  animation: string;
  title: string;
  subtitle: string;
}

export function StatusBadge({ couponStatus, triggerStatus }: StatusBadgeProps) {
  const statusConfig = useMemo((): StatusConfig | null => {
    if (!couponStatus) return null;

    if (couponStatus === COUPON_STATUS.INVALID) {
      return {
        lottieUrl: LOTTIE_URLS.warning,
        lottieLoop: false,
        accentColor: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200',
        animation: 'animate-pop-in',
        title: '유효하지 않은 바코드입니다',
        subtitle: '',
      };
    }

    if (couponStatus === COUPON_STATUS.ALREADY_USED) {
      return {
        lottieUrl: LOTTIE_URLS.warning,
        lottieLoop: false,
        accentColor: 'text-amber-600',
        bgColor: 'bg-amber-50 border-amber-200',
        animation: 'animate-pop-in',
        title: '이미 사용된 바코드예요',
        subtitle: '다른 바코드를 스캔해주세요',
      };
    }

    if (couponStatus === COUPON_STATUS.VALID_AND_REDEEMED) {
      const configs: Record<TriggerStatus, StatusConfig> = {
        idle: {
          lottieUrl: LOTTIE_URLS.success,
          lottieLoop: false,
          accentColor: 'text-emerald-600',
          bgColor: 'bg-emerald-50 border-emerald-200',
          animation: 'animate-pop-in',
          title: '바코드 확인 완료',
          subtitle: '잠시만 기다려주세요',
        },
        sending: {
          lottieUrl: LOTTIE_URLS.loading,
          lottieLoop: true,
          accentColor: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200',
          animation: 'animate-pop-in animate-pulse-glow',
          title: '배출 요청 중...',
          subtitle: '잠시만 기다려주세요',
        },
        success: {
          lottieUrl: LOTTIE_URLS.success,
          lottieLoop: false,
          accentColor: 'text-emerald-600',
          bgColor: 'bg-emerald-50 border-emerald-200',
          animation: 'animate-pop-in',
          title: '포토카드 발급 완료!',
          subtitle: '아래에서 수령해주세요',
        },
        failed: {
          lottieUrl: LOTTIE_URLS.warning,
          lottieLoop: false,
          accentColor: 'text-rose-600',
          bgColor: 'bg-rose-50 border-rose-200',
          animation: 'animate-pop-in animate-shake',
          title: '배출에 실패했어요',
          subtitle: '잠시 후 다시 시도해주세요',
        },
      };
      return configs[triggerStatus];
    }

    return null;
  }, [couponStatus, triggerStatus]);

  if (!statusConfig) return null;

  const { lottieUrl, lottieLoop, accentColor, bgColor, animation, title, subtitle } = statusConfig;

  return (
    <div className={`w-72 min-h-48 rounded-2xl px-8 py-6 border-2 shadow-xl flex flex-col items-center justify-center ${bgColor} ${animation}`}>
      <div className="w-24 h-24 mb-4">
        <LottieAnimation url={lottieUrl} loop={lottieLoop} />
      </div>
      <p className={`text-xl font-bold text-center mb-1 ${accentColor}`}>{title}</p>
      {subtitle && <p className="text-sm text-gray-600 text-center">{subtitle}</p>}
    </div>
  );
}
