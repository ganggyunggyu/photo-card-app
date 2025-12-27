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
  const [lastCode, setLastCode] = useState<string>('');
  const [couponStatus, setCouponStatus] = useState<CouponStatus | null>(null);
  const [triggerStatus, setTriggerStatus] = useState<TriggerStatus>('idle');
  const [isLocked, setIsLocked] = useState(false);

  const {
    connectionStatus,
    connect,
    disconnect,
    sendDispenseCommand,
    errorMessage,
  } = useESP32();

  const connectionStatusRef = useRef(connectionStatus);
  const sendDispenseCommandRef = useRef(sendDispenseCommand);

  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  useEffect(() => {
    sendDispenseCommandRef.current = sendDispenseCommand;
  }, [sendDispenseCommand]);

  const handleScan = useCallback(async (code: string) => {
    setLastCode(code);
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

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col relative">
      {/* 배경 이미지 */}
      <Image
        src="/background.png"
        alt="background"
        fill
        className="object-cover"
        priority
      />

      {/* 콘텐츠 래퍼 */}
      <div className="relative z-10 h-full w-full flex flex-col">
        {/* 터치 잠금/해제 버튼 - 좌상단 */}
        <button
          data-lock-button
          onClick={() => setIsLocked(!isLocked)}
          style={{ zIndex: 99999 }}
          className={`fixed top-4 left-4 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all ${
            isLocked ? 'bg-red-500' : 'bg-emerald-500'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="white"
            className="w-6 h-6"
          >
            {isLocked ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            )}
          </svg>
        </button>

        {/* ESP32 상태 뱃지 - 우상단 */}
        <button
          onClick={connectionStatus === 'connected' ? disconnect : connect}
          disabled={connectionStatus === 'connecting'}
          style={{ zIndex: 99999 }}
          className={`fixed top-4 right-4 px-4 py-2 rounded-lg font-bold text-sm text-white shadow-lg transition-all ${badge.bg} ${
            connectionStatus === 'connecting' ? 'animate-pulse' : ''
          }`}
        >
          {badge.text}
        </button>

        {/* 터치 잠금 오버레이 - 잠금버튼 제외 전체 화면 */}
        {isLocked && (
          <div
            className="fixed inset-0 z-9999"
            style={{ pointerEvents: 'auto' }}
            onTouchStart={(e) => {
              const target = e.target as HTMLElement;
              const isLockButton = target.closest('[data-lock-button]');
              if (!isLockButton) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onTouchMove={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
          />
        )}

        {/* 메인 영역 - 카메라 + 콘텐츠 중앙보다 약간 아래 */}
        <div className="flex-1 flex flex-col items-center justify-center gap-10 px-8 pt-32">
          {/* 카메라 영역 */}
          <div className="w-100 h-52 rounded-lg overflow-hidden bg-gray-900 shadow-2xl">
            <CameraTab onScan={handleScan} />
          </div>

          {/* 텍스트 콘텐츠 */}
          <div className="flex flex-col items-center gap-0">
            <h1 className="text-4xl font-bold text-gray-800">QR코드 인식</h1>
            <p className="text-lg text-gray-500">QR Code Recognition</p>

            <p className="text-xl font-medium text-gray-800 mt-4">
              QR코드를 카메라에 바르게 인식시켜 주세요.
            </p>
            <p className="text-base text-gray-500">
              Please align the QR code within the camera frame.
            </p>

            {lastCode && (
              <span className="bg-white/80 px-6 py-2 rounded-full font-mono text-lg text-gray-700 shadow mt-3">
                {lastCode}
              </span>
            )}

            {errorMessage && (
              <span className="bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm mt-3">
                {errorMessage}
              </span>
            )}

            <div className="mt-3">
              <StatusBadge
                couponStatus={couponStatus}
                triggerStatus={triggerStatus}
              />
            </div>
          </div>
        </div>

        {/* 하단 로고 */}
        <div className="w-full flex justify-center pb-10 shrink-0">
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
