'use client';

import React from 'react';
import { useBarcodeScanner } from '../hooks';

interface BarcodeTabProps {
  onScan: (code: string) => void;
  isActive: boolean;
}

export function BarcodeTab({ onScan, isActive }: BarcodeTabProps) {
  const { lastScannedCode, isScanning, inputRef } = useBarcodeScanner(
    isActive ? onScan : () => {}
  );

  if (!isActive) return null;

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <input
        ref={inputRef}
        type="text"
        className="opacity-0 absolute -z-10"
        autoFocus
        tabIndex={-1}
      />
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-6 relative">
          <div className={`w-full h-full border-4 rounded-lg ${isScanning ? 'border-blue-500 animate-pulse' : 'border-gray-300'}`}>
            <svg
              className="w-full h-full p-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-medium text-gray-700 mb-2">
          {isScanning ? '스캔 중...' : '바코드 리더 대기 중'}
        </h3>
        <p className="text-gray-500">
          USB 바코드 리더로 쿠폰을 스캔하세요
        </p>
        {lastScannedCode && (
          <p className="mt-4 text-sm text-gray-400">
            마지막 스캔: {lastScannedCode}
          </p>
        )}
      </div>
    </div>
  );
}
