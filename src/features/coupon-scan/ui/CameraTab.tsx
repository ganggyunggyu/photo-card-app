'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface CameraTabProps {
  onScan: (code: string) => void;
}

export function CameraTab({ onScan }: CameraTabProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    const initCamera = async () => {
      try {
        setError(null);
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        const videoInputDeviceList = await BrowserMultiFormatReader.listVideoInputDevices();

        if (videoInputDeviceList.length === 0) {
          setError('카메라를 찾을 수 없습니다. 카메라 권한을 확인해주세요.');
          return;
        }

        // 전면 카메라 우선 선택 (셀카 모드)
        const frontCamera = videoInputDeviceList.find(
          (device) =>
            device.label.toLowerCase().includes('front') ||
            device.label.toLowerCase().includes('selfie') ||
            device.label.includes('전면') ||
            device.label.includes('facetime')
        );
        const selectedDeviceId = frontCamera?.deviceId || videoInputDeviceList[0].deviceId;

        await reader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current!,
          (result) => {
            if (result) {
              const now = Date.now();
              const scannedText = result.getText();

              if (
                scannedText !== lastScannedRef.current ||
                now - lastScanTimeRef.current > 2000
              ) {
                lastScannedRef.current = scannedText;
                lastScanTimeRef.current = now;
                onScan(scannedText);
              }
            }
          }
        );

        setIsInitialized(true);
      } catch (err) {
        console.error('Camera init error:', err);
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';

        if (errorMessage.includes('Permission') || errorMessage.includes('NotAllowed')) {
          setError('카메라 권한이 필요합니다. 설정에서 카메라 권한을 허용해주세요.');
        } else if (errorMessage.includes('NotFound')) {
          setError('카메라를 찾을 수 없습니다.');
        } else if (errorMessage.includes('NotReadable') || errorMessage.includes('AbortError')) {
          setError('카메라가 다른 앱에서 사용 중입니다.');
        } else {
          setError(`카메라 초기화 실패: ${errorMessage}`);
        }
      }
    };

    initCamera();

    return () => {
      if (readerRef.current) {
        BrowserMultiFormatReader.releaseAllStreams();
        readerRef.current = null;
      }
    };
  }, [onScan]);

  return (
    <div className="h-full w-full">
      {error ? (
        <div className="h-full flex items-center justify-center bg-gray-900">
          <div className="text-center p-6">
            <p className="text-2xl font-bold text-red-400 mb-3">카메라 오류</p>
            <p className="text-lg text-gray-300 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              iOS: 설정 → Safari → 카메라 허용 확인
            </p>
          </div>
        </div>
      ) : (
        <div className="relative h-full w-full bg-black">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
          />
          {!isInitialized && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-white text-2xl">카메라 초기화 중...</div>
            </div>
          )}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-72 h-72 border-4 border-white/50 rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
