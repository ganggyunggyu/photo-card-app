'use client';

import { useMemo, useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { COUPON_STATUS } from '../lib';
import type { CouponStatus, TriggerStatus } from '../types';

const LOTTIE_URLS = {
  success: 'https://assets2.lottiefiles.com/packages/lf20_jbrw3hcz.json',
  error: 'https://assets4.lottiefiles.com/packages/lf20_tl52xzvn.json',
  warning: 'https://assets3.lottiefiles.com/packages/lf20_s2lryxtd.json',
  loading: 'https://assets9.lottiefiles.com/packages/lf20_kxsd2ytq.json',
  check: 'https://assets5.lottiefiles.com/packages/lf20_obhph3sh.json',
};

interface StatusBadgeProps {
  couponStatus: CouponStatus | null;
  triggerStatus: TriggerStatus;
}

function LottieFromUrl({ url, size = 100 }: { url: string; size?: number }) {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    fetch(url)
      .then((res) => res.json())
      .then(setAnimationData)
      .catch(console.error);
  }, [url]);

  if (!animationData) {
    return <div className="w-24 h-24 animate-pulse bg-white/20 rounded-full mx-auto mb-4" />;
  }

  return (
    <div className="flex justify-center mb-4">
      <Lottie
        animationData={animationData}
        loop={true}
        autoplay={true}
        style={{ width: size, height: size }}
      />
    </div>
  );
}

export function StatusBadge({ couponStatus, triggerStatus }: StatusBadgeProps) {
  const statusConfig = useMemo(() => {
    if (!couponStatus) return null;

    if (couponStatus === COUPON_STATUS.INVALID) {
      return {
        lottieUrl: LOTTIE_URLS.error,
        bgColor: 'bg-white/90',
        title: '유효하지 않은 바코드',
        titleColor: 'text-red-500',
        subtitle: '다시 확인해주세요',
        subtitleColor: 'text-gray-600',
      };
    }

    if (couponStatus === COUPON_STATUS.ALREADY_USED) {
      return {
        lottieUrl: LOTTIE_URLS.warning,
        bgColor: 'bg-white/90',
        title: '이미 사용된 바코드',
        titleColor: 'text-amber-500',
        subtitle: '이 바코드는 이미 사용되었어요',
        subtitleColor: 'text-gray-600',
      };
    }

    if (couponStatus === COUPON_STATUS.VALID_AND_REDEEMED) {
      const configs: Record<TriggerStatus, typeof statusConfig> = {
        idle: {
          lottieUrl: LOTTIE_URLS.check,
          bgColor: 'bg-emerald-500',
          title: '확인 완료!',
          titleColor: 'text-white',
          subtitle: '잠시만 기다려주세요',
          subtitleColor: 'text-white/80',
        },
        sending: {
          lottieUrl: LOTTIE_URLS.loading,
          bgColor: 'bg-violet-500',
          title: '카드 출력 중...',
          titleColor: 'text-white',
          subtitle: '조금만 기다려주세요!',
          subtitleColor: 'text-white/80',
        },
        success: {
          lottieUrl: LOTTIE_URLS.success,
          bgColor: 'bg-pink-500',
          title: '포토카드 발급 완료!',
          titleColor: 'text-white',
          subtitle: '아래에서 카드를 받아가세요',
          subtitleColor: 'text-white/80',
        },
        failed: {
          lottieUrl: LOTTIE_URLS.check,
          bgColor: 'bg-white/90',
          title: '바코드 확인 완료',
          titleColor: 'text-gray-800',
          subtitle: 'ESP32 연결 후 다시 스캔해주세요',
          subtitleColor: 'text-gray-600',
        },
      };
      return configs[triggerStatus];
    }

    return null;
  }, [couponStatus, triggerStatus]);

  if (!statusConfig) return null;

  const { lottieUrl, bgColor, title, titleColor, subtitle, subtitleColor } = statusConfig;

  return (
    <div className={`${bgColor} rounded-2xl px-8 py-6 shadow-lg text-center`}>
      <LottieFromUrl url={lottieUrl} />
      <p className={`text-2xl font-bold ${titleColor} mb-2`}>{title}</p>
      <p className={subtitleColor}>{subtitle}</p>
    </div>
  );
}
