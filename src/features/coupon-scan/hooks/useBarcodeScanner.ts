'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BARCODE_INPUT_TIMEOUT_MS, BARCODE_MIN_LENGTH } from '@shared/lib';

interface UseBarcodeScanner {
  lastScannedCode: string;
  isScanning: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function useBarcodeScanner(
  onScan: (code: string) => void
): UseBarcodeScanner {
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
    setIsScanning(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // 타이핑 간격이 길면 버퍼 리셋 (사람 타이핑으로 간주)
      if (timeSinceLastKey > BARCODE_INPUT_TIMEOUT_MS && bufferRef.current.length > 0) {
        resetBuffer();
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const scannedCode = bufferRef.current.trim();

        if (scannedCode.length >= BARCODE_MIN_LENGTH) {
          setLastScannedCode(scannedCode);
          onScan(scannedCode);
        }

        resetBuffer();
        return;
      }

      // 숫자와 문자만 버퍼에 추가
      if (e.key.length === 1 && /[\w\d]/.test(e.key)) {
        bufferRef.current += e.key;
        setIsScanning(true);
      }
    },
    [onScan, resetBuffer]
  );

  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    focusInput();
    document.addEventListener('click', focusInput);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', focusInput);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return { lastScannedCode, isScanning, inputRef };
}
