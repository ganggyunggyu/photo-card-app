'use client';

import { useMemo, useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { COUPON_STATUS } from '../lib';
import type { CouponStatus, TriggerStatus } from '../types';

const LOTTIE_URLS = {
  success: 'https://lottie.host/4db68bbd-31f6-4cd8-84eb-189571e55d00/7cqYZAMy9t.json',
  error: 'https://lottie.host/d3a98b65-81ab-4d72-89b9-9e9ec3c4c943/xLdPV3eZMF.json',
  warning: 'https://lottie.host/17e0f4e5-0e8d-4a1b-a7c1-9c68d8d0c8e5/FfXL4YyYcF.json',
  loading: 'https://lottie.host/f0b4d7c3-7e9e-4a1b-8c3d-9e7f5a6b8c9d/spinner.json',
};

interface StatusBadgeProps {
  couponStatus: CouponStatus | null;
  triggerStatus: TriggerStatus;
}

function LottieAnimation({ url, size = 80, loop = true }: { url: string; size?: number; loop?: boolean }) {
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
    return (
      <div
        className="rounded-full bg-gray-100 animate-pulse mx-auto"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <Lottie
      animationData={animationData}
      loop={loop}
      autoplay={true}
      style={{ width: size, height: size, margin: '0 auto' }}
    />
  );
}

interface StatusConfig {
  lottieUrl: string;
  lottieLoop: boolean;
  accentColor: string;
  title: string;
  subtitle: string;
}

export function StatusBadge({ couponStatus, triggerStatus }: StatusBadgeProps) {
  const statusConfig = useMemo((): StatusConfig | null => {
    if (!couponStatus) return null;

    if (couponStatus === COUPON_STATUS.INVALID) {
      return {
        lottieUrl: LOTTIE_URLS.error,
        lottieLoop: false,
        accentColor: 'text-red-500',
        title: '유효하지 않은 바코드예요',
        subtitle: '바코드를 다시 확인해주세요',
      };
    }

    if (couponStatus === COUPON_STATUS.ALREADY_USED) {
      return {
        lottieUrl: LOTTIE_URLS.warning,
        lottieLoop: false,
        accentColor: 'text-amber-500',
        title: '이미 사용된 바코드예요',
        subtitle: '다른 바코드를 스캔해주세요',
      };
    }

    if (couponStatus === COUPON_STATUS.VALID_AND_REDEEMED) {
      const configs: Record<TriggerStatus, StatusConfig> = {
        idle: {
          lottieUrl: LOTTIE_URLS.success,
          lottieLoop: false,
          accentColor: 'text-emerald-500',
          title: '바코드 확인 완료',
          subtitle: '잠시만 기다려주세요',
        },
        sending: {
          lottieUrl: LOTTIE_URLS.loading,
          lottieLoop: true,
          accentColor: 'text-blue-500',
          title: '포토카드 출력 중',
          subtitle: '카드가 곧 나옵니다',
        },
        success: {
          lottieUrl: LOTTIE_URLS.success,
          lottieLoop: false,
          accentColor: 'text-blue-500',
          title: '포토카드 발급 완료',
          subtitle: '아래에서 수령해주세요',
        },
        failed: {
          lottieUrl: LOTTIE_URLS.warning,
          lottieLoop: false,
          accentColor: 'text-gray-500',
          title: '장치 연결이 필요해요',
          subtitle: '연결 후 다시 스캔해주세요',
        },
      };
      return configs[triggerStatus];
    }

    return null;
  }, [couponStatus, triggerStatus]);

  if (!statusConfig) return null;

  const { lottieUrl, lottieLoop, title, subtitle } = statusConfig;

  return (
    <div className="bg-white rounded-2xl px-10 py-8 shadow-lg animate-fade-in">
      <div className="mb-5">
        <LottieAnimation url={lottieUrl} size={80} loop={lottieLoop} />
      </div>
      <p className="text-xl font-semibold text-gray-900 text-center mb-1">{title}</p>
      <p className="text-base text-gray-500 text-center">{subtitle}</p>
    </div>
  );
}
