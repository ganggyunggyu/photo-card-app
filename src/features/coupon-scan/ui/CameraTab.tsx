'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => BarcodeDetector;
  }
  interface BarcodeDetector {
    detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
  }
  interface DetectedBarcode {
    rawValue: string;
    format: string;
    boundingBox: DOMRectReadOnly;
  }
}

interface CameraTabProps {
  onScan: (code: string) => void;
}

const SCAN_INTERVAL_MS = 100;
const DUPLICATE_THRESHOLD_MS = 2000;

export function CameraTab({ onScan }: CameraTabProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  const handleDetection = useCallback((code: string) => {
    const now = Date.now();
    if (code !== lastScannedRef.current || now - lastScanTimeRef.current > DUPLICATE_THRESHOLD_MS) {
      lastScannedRef.current = code;
      lastScanTimeRef.current = now;
      onScan(code);
    }
  }, [onScan]);

  useEffect(() => {
    const initCamera = async () => {
      try {
        setError(null);

        if (!window.BarcodeDetector) {
          setError('이 브라우저는 바코드 스캔을 지원하지 않습니다. Chrome을 사용해주세요.');
          return;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');

        if (videoDevices.length === 0) {
          setError('카메라를 찾을 수 없습니다.');
          return;
        }

        const frontCamera = videoDevices.find(
          (device) =>
            device.label.toLowerCase().includes('front') ||
            device.label.toLowerCase().includes('selfie') ||
            device.label.includes('전면') ||
            device.label.includes('facetime')
        );
        const selectedDeviceId = frontCamera?.deviceId || videoDevices[0].deviceId;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: selectedDeviceId,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
        });
        streamRef.current = stream;

        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        const detector = new window.BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e'],
        });

        const scan = async () => {
          if (!video || video.readyState !== 4) return;
          try {
            const barcodes = await detector.detect(video);
            if (barcodes.length > 0) {
              handleDetection(barcodes[0].rawValue);
            }
          } catch {
            // 스캔 실패 시 무시
          }
        };

        scanIntervalRef.current = window.setInterval(scan, SCAN_INTERVAL_MS);
        setIsInitialized(true);
      } catch (err) {
        console.error('Camera init error:', err);
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';

        if (errorMessage.includes('Permission') || errorMessage.includes('NotAllowed')) {
          setError('카메라 권한이 필요합니다.');
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
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [handleDetection]);

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
