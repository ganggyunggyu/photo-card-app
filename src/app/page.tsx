'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { CameraTab } from '@features/coupon-scan';
import { StatusBadge } from '@shared/ui';
import { useESP32 } from '@features/esp-connection';
import { COUPON_STATUS } from '@shared/lib';
import type {
  CouponStatus,
  TriggerStatus,
  ValidateResponse,
} from '@shared/types';

export default function Home() {
  const [couponStatus, setCouponStatus] = useState<CouponStatus | null>(null);
  const [triggerStatus, setTriggerStatus] = useState<TriggerStatus>('idle');

  const {
    connectionStatus,
    connect,
    disconnect,
    sendDispenseCommand,
    errorMessage,
  } = useESP32();

  const connectionStatusRef = useRef(connectionStatus);
  const sendDispenseCommandRef = useRef(sendDispenseCommand);
  const couponStatusRef = useRef(couponStatus);
  const triggerStatusRef = useRef(triggerStatus);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  useEffect(() => {
    sendDispenseCommandRef.current = sendDispenseCommand;
  }, [sendDispenseCommand]);

  useEffect(() => {
    couponStatusRef.current = couponStatus;
  }, [couponStatus]);

  useEffect(() => {
    triggerStatusRef.current = triggerStatus;
  }, [triggerStatus]);

  // 피드백 자동 닫힘 (sending 중에는 닫지 않음)
  useEffect(() => {
    if (!couponStatus) return;
    if (triggerStatus === 'sending') return; // 로딩 중에는 닫지 않음

    // 성공 시 5초, 그 외 3초
    const duration = triggerStatus === 'success' ? 5000 : 3000;

    const timeout = setTimeout(() => {
      setCouponStatus(null);
      setTriggerStatus('idle');
      // 피드백 닫힌 후 2초 쿨다운
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 2000);
    }, duration);

    return () => clearTimeout(timeout);
  }, [couponStatus, triggerStatus]);

  const handleScan = useCallback(async (code: string) => {
    // 처리 중이거나 피드백 표시 중이면 스캔 무시
    if (isProcessingRef.current) return;
    if (couponStatusRef.current || triggerStatusRef.current !== 'idle') return;

    isProcessingRef.current = true; // 스캔 즉시 잠금

    setCouponStatus(null);
    setTriggerStatus('idle');

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponNumber: code }),
      });

      const data: ValidateResponse = await response.json();
      setCouponStatus(data.status);

      if (data.status === COUPON_STATUS.VALID_AND_REDEEMED) {
        if (connectionStatusRef.current === 'connected') {
          setTriggerStatus('sending');
          const success = await sendDispenseCommandRef.current();
          setTriggerStatus(success ? 'success' : 'failed');
        } else {
          setTriggerStatus('failed');
        }
      }
    } catch (error) {
      console.error('Validation error:', error);
      setCouponStatus(COUPON_STATUS.INVALID);
    }
  }, []);

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return { text: '배출기 연결됨', bg: 'bg-green-500' };
      case 'connecting':
        return { text: '배출기 연결중...', bg: 'bg-yellow-500' };
      case 'error':
        return { text: '배출기 연결 끊김', bg: 'bg-red-500' };
      default:
        return { text: '배출기 연결 끊김', bg: 'bg-red-500' };
    }
  };

  const badge = getConnectionBadge();

  // 시나리오 테스트 함수들
  const runScenario = async (
    scenario: 'success' | 'error' | 'invalid' | 'already_used'
  ) => {
    setCouponStatus(null);
    setTriggerStatus('idle');

    await new Promise((r) => setTimeout(r, 500));

    switch (scenario) {
      case 'success':
        setCouponStatus(COUPON_STATUS.VALID_AND_REDEEMED);
        setTriggerStatus('sending');
        await new Promise((r) => setTimeout(r, 1500));
        setTriggerStatus('success');
        break;

      case 'error':
        setCouponStatus(COUPON_STATUS.VALID_AND_REDEEMED);
        setTriggerStatus('sending');
        await new Promise((r) => setTimeout(r, 1500));
        setTriggerStatus('failed');
        break;

      case 'invalid':
        setCouponStatus(COUPON_STATUS.INVALID);
        break;

      case 'already_used':
        setCouponStatus(COUPON_STATUS.ALREADY_USED);
        break;
    }
  };

  return (
    <div className="h-dvh w-screen overflow-hidden flex flex-col relative">
      {/* 배경 이미지 */}
      <Image
        src="/background.png"
        alt="background"
        fill
        className="object-fill"
        priority
        quality={100}
        unoptimized
      />

      {/* 콘텐츠 래퍼 */}
      <div className="relative z-10 h-full w-full flex flex-col">
        {/* ESP32 상태 뱃지 - 우상단 */}
        <button
          onClick={connectionStatus === 'connected' ? disconnect : connect}
          disabled={connectionStatus === 'connecting'}
          style={{ zIndex: 99999 }}
          className={`fixed top-4 right-4 px-4 py-2 rounded-lg font-bold text-sm text-white shadow-lg transition-all ${
            badge.bg
          } ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`}
        >
          {badge.text}
        </button>

        {/* 메인 영역 */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 pt-60 min-h-0">
          {/* 카메라 영역 */}
          <div className="w-80 h-44 rounded-lg overflow-hidden bg-gray-900 shadow-2xl shrink-0">
            <CameraTab onScan={handleScan} />
          </div>

          {/* 텍스트 콘텐츠 */}
          <div className="flex flex-col items-center shrink-0">
            <h1 className="text-3xl font-bold text-gray-800">바코드 인식</h1>
            <p className="text-base text-gray-500">Barcode Recognition</p>

            <p className="text-lg font-medium text-gray-800 mt-2">
              바코드를 카메라에 바르게 인식시켜 주세요.
            </p>
            <p className="text-sm text-gray-500">
              Please align the barcode within the camera frame.
            </p>
          </div>

          {errorMessage && (
            <span className="bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm">
              {errorMessage}
            </span>
          )}
        </div>

        {/* 피드백 오버레이 - 화면 중앙 고정, 클릭하면 닫힘 */}
        {couponStatus && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm cursor-pointer"
            onClick={() => {
              setCouponStatus(null);
              setTriggerStatus('idle');
              // 클릭 닫기 후 2초 쿨다운
              setTimeout(() => {
                isProcessingRef.current = false;
              }, 2000);
            }}
          >
            <StatusBadge
              couponStatus={couponStatus}
              triggerStatus={triggerStatus}
            />
          </div>
        )}

        {/* 시나리오 테스트 버튼들 */}
        <div className="flex flex-wrap justify-center gap-2 px-4 shrink-0">
          <button
            onClick={() => runScenario('success')}
            className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg"
          >
            성공 시나리오
          </button>
          <button
            onClick={() => runScenario('invalid')}
            className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg"
          >
            실패 시나리오
          </button>
          <button
            onClick={() => runScenario('error')}
            className="px-3 py-1.5 bg-rose-600 text-white text-sm rounded-lg"
          >
            에러 시나리오
          </button>
          <button
            onClick={() => runScenario('already_used')}
            className="px-3 py-1.5 bg-amber-500 text-white text-sm rounded-lg"
          >
            사용된 바코드
          </button>
        </div>

        {/* 하단 로고 */}
        <div className="w-full flex justify-center pb-6 shrink-0">
          <Image
            src="/logo.png"
            alt="JEJU BUDDIES"
            width={180}
            height={50}
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}
