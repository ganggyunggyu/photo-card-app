'use client';

import { useState, useCallback } from 'react';
import { CameraTab } from '@features/coupon-scan';
import { StatusBadge } from '@shared/ui';
import { useESP32 } from '@features/esp-connection';
import { COUPON_STATUS } from '@shared/lib';
import type { CouponStatus, TriggerStatus, ValidateResponse } from '@shared/types';

export default function Home() {
  const [lastCode, setLastCode] = useState<string>('');
  const [couponStatus, setCouponStatus] = useState<CouponStatus | null>(null);
  const [triggerStatus, setTriggerStatus] = useState<TriggerStatus>('idle');
  const [isLocked, setIsLocked] = useState(false);
  const [showIpInput, setShowIpInput] = useState(false);
  const [ipInput, setIpInput] = useState('');

  const {
    connectionStatus,
    espIp,
    setEspIp,
    connect,
    disconnect,
    sendDispenseCommand,
    errorMessage,
  } = useESP32();

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
            const success = await sendDispenseCommand();
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
    [connectionStatus, sendDispenseCommand]
  );

  const handleIpSave = () => {
    if (ipInput.trim()) {
      setEspIp(ipInput.trim());
    }
    setShowIpInput(false);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-linear-to-b from-sky-200 via-sky-100 to-emerald-100">
      {/* 터치 잠금/해제 버튼 - 좌상단 (항상 최상단, 오버레이 위) */}
      <button
        onClick={() => setIsLocked(!isLocked)}
        style={{ zIndex: 99999 }}
        className={`fixed top-4 left-4 px-4 py-2 rounded-full font-bold text-sm shadow-lg transition-all ${
          isLocked ? 'bg-red-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-800'
        }`}
      >
        {isLocked ? '잠금 해제' : '터치 잠금'}
      </button>

      {/* 터치 잠금 오버레이 - 카메라 영역 제외하고 전부 차단 */}
      {isLocked && (
        <>
          <div
            className="fixed top-0 left-40 right-0 h-16 z-9999"
            onTouchStart={(e) => e.preventDefault()}
            onTouchMove={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
          />
          <div
            className="fixed top-16 left-0 w-[30vw] h-[25vh] z-9999"
            onTouchStart={(e) => e.preventDefault()}
            onTouchMove={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
          />
          <div
            className="fixed top-16 right-0 w-[30vw] h-[25vh] z-9999"
            onTouchStart={(e) => e.preventDefault()}
            onTouchMove={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
          />
          <div
            className="fixed top-[calc(4rem+25vh+1rem)] left-0 right-0 bottom-0 z-9999"
            onTouchStart={(e) => e.preventDefault()}
            onTouchMove={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
          />
        </>
      )}

      {/* ESP32 연결 영역 - 우상단 */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {errorMessage && (
          <span className="bg-red-100 text-red-600 px-3 py-1.5 rounded-full text-sm">
            {errorMessage}
          </span>
        )}

        {/* IP 설정 모달 */}
        {showIpInput && (
          <div className="flex items-center gap-2 bg-white rounded-full px-3 py-1.5 shadow-lg">
            <input
              type="text"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              placeholder="ESP32 IP"
              className="w-36 px-2 py-1 text-sm border rounded"
            />
            <button
              onClick={handleIpSave}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded"
            >
              저장
            </button>
            <button
              onClick={() => setShowIpInput(false)}
              className="px-2 py-1 text-gray-500 text-sm"
            >
              취소
            </button>
          </div>
        )}

        {/* IP 표시 버튼 */}
        <button
          onClick={() => {
            setIpInput(espIp);
            setShowIpInput(!showIpInput);
          }}
          className="px-3 py-2 bg-gray-100 text-gray-600 rounded-full text-xs font-mono"
        >
          {espIp}
        </button>

        {/* 연결 버튼 */}
        <button
          onClick={connectionStatus === 'connected' ? disconnect : connect}
          disabled={connectionStatus === 'connecting'}
          className={`px-4 py-2 rounded-full font-bold text-sm shadow-lg transition-all ${
            connectionStatus === 'connected'
              ? 'bg-green-500 text-white'
              : connectionStatus === 'connecting'
              ? 'bg-yellow-400 text-white animate-pulse'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {connectionStatus === 'connected'
            ? 'ESP32 연결됨'
            : connectionStatus === 'connecting'
            ? '연결 중...'
            : 'ESP32 연결'}
        </button>
      </div>

      {/* 상단 - 카메라 */}
      <div className="pt-16 pb-4 flex justify-center">
        <div className="w-[40vw] h-[25vh] rounded-2xl overflow-hidden shadow-2xl border-4 border-white/50">
          <CameraTab onScan={handleScan} />
        </div>
      </div>

      {/* 하단 - 타이틀 & 안내 & 상태 */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-800 mb-2">포토카드 발급</h1>
          <p className="text-xl text-gray-600 mb-8">Photo Card Kiosk</p>

          <p className="text-2xl text-gray-700 mb-4">
            바코드를 카메라에 스캔해 주세요
          </p>
          <p className="text-lg text-gray-500">
            please scan the barcode on the camera
          </p>

          {/* 스캔된 코드 표시 */}
          {lastCode && (
            <div className="mt-8 bg-white/60 px-6 py-3 rounded-full inline-block">
              <span className="font-mono text-xl text-gray-700">{lastCode}</span>
            </div>
          )}

          {/* 상태 표시 */}
          <div className="mt-8">
            <StatusBadge couponStatus={couponStatus} triggerStatus={triggerStatus} />
          </div>
        </div>
      </div>
    </div>
  );
}
