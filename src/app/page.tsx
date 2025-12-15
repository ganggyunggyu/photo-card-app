'use client';

import { useState, useCallback } from 'react';
import { CameraTab } from '@features/coupon-scan';
import { StatusBadge } from '@shared/ui';
import { useBLE } from '@features/ble-connection';
import { COUPON_STATUS } from '@shared/lib';
import type { CouponStatus, TriggerStatus, ValidateResponse } from '@shared/types';

export default function Home() {
  const [lastCode, setLastCode] = useState<string>('');
  const [couponStatus, setCouponStatus] = useState<CouponStatus | null>(null);
  const [triggerStatus, setTriggerStatus] = useState<TriggerStatus>('idle');
  const { connectionStatus, connect, disconnect, sendPrintCommand, errorMessage } = useBLE();

  const handleScan = useCallback(
    async (code: string) => {
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
          if (connectionStatus === 'connected') {
            setTriggerStatus('sending');
            const success = await sendPrintCommand();
            setTriggerStatus(success ? 'success' : 'failed');
          } else {
            setTriggerStatus('failed');
          }
        }
      } catch (error) {
        console.error('Validation error:', error);
        setCouponStatus(COUPON_STATUS.INVALID);
      }
    },
    [connectionStatus, sendPrintCommand]
  );

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-100">
      {/* ESP32 페어링 버튼 - 상단 */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
        <button
          onClick={connectionStatus === 'connected' ? disconnect : connect}
          disabled={connectionStatus === 'connecting'}
          className={`px-6 py-3 rounded-full font-bold text-lg shadow-lg transition-all ${
            connectionStatus === 'connected'
              ? 'bg-green-500 text-white'
              : connectionStatus === 'connecting'
              ? 'bg-yellow-400 text-white animate-pulse'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {connectionStatus === 'connected'
            ? '🟢 ESP32 연결됨'
            : connectionStatus === 'connecting'
            ? '⏳ 연결 중...'
            : '🔌 ESP32 연결'}
        </button>
        {errorMessage && (
          <span className="bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm">
            {errorMessage}
          </span>
        )}
      </div>

      {/* 카메라 영역 - 상단 35% */}
      <div className="h-[35%] p-4">
        <div className="h-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50">
          <CameraTab onScan={handleScan} />
        </div>
      </div>

      {/* 피드백 영역 - 하단 65% */}
      <div className="h-[65%] p-4 pt-2 flex flex-col">
        {lastCode && (
          <div className="mb-4 text-center">
            <p className="text-lg text-gray-500 mb-1">스캔된 코드</p>
            <p className="font-mono text-3xl font-black text-gray-700 bg-white/60 inline-block px-6 py-2 rounded-full">
              {lastCode}
            </p>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-xl">
            <StatusBadge couponStatus={couponStatus} triggerStatus={triggerStatus} />
          </div>
        </div>
      </div>
    </div>
  );
}
