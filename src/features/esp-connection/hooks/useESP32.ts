'use client';

import { useState, useCallback, useRef } from 'react';

type ESPConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseESP32 {
  connectionStatus: ESPConnectionStatus;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendDispenseCommand: () => Promise<boolean>;
  errorMessage: string | null;
}

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

export function useESP32(): UseESP32 {
  const [connectionStatus, setConnectionStatus] = useState<ESPConnectionStatus>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const connect = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      setErrorMessage(null);
      console.log('[BLE] 연결 시작...');

      // Web Bluetooth API 지원 확인
      if (!navigator.bluetooth) {
        throw new Error('이 브라우저는 Web Bluetooth를 지원하지 않습니다. Chrome을 사용하세요.');
      }

      // BLE 디바이스 선택
      console.log('[BLE] 디바이스 선택 중...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'PhotoCard' }],
        optionalServices: [SERVICE_UUID],
      });
      console.log('[BLE] 디바이스 선택됨:', device.name);

      deviceRef.current = device;

      // 연결 해제 이벤트 리스너 + 자동 재연결
      device.addEventListener('gattserverdisconnected', async () => {
        console.log('[BLE] 연결 해제됨 - 자동 재연결 시도...');
        characteristicRef.current = null;

        // 자동 재연결 시도 (최대 3회)
        for (let i = 0; i < 3; i++) {
          try {
            setConnectionStatus('connecting');
            await new Promise((r) => setTimeout(r, 1000)); // 1초 대기

            const server = await device.gatt?.connect();
            if (server) {
              const service = await server.getPrimaryService(SERVICE_UUID);
              const char = await service.getCharacteristic(CHARACTERISTIC_UUID);
              characteristicRef.current = char;
              setConnectionStatus('connected');
              console.log('[BLE] 자동 재연결 성공!');
              return;
            }
          } catch (e) {
            console.log(`[BLE] 재연결 시도 ${i + 1}/3 실패`);
          }
        }

        setConnectionStatus('disconnected');
        setErrorMessage('연결이 끊어졌습니다');
      });

      // GATT 서버 연결
      console.log('[BLE] GATT 서버 연결 중...');
      let server;
      try {
        server = await device.gatt?.connect();
        if (!server) {
          throw new Error('GATT 서버가 null입니다');
        }
        console.log('[BLE] GATT 연결됨');
      } catch (gattError) {
        console.error('[BLE] GATT 연결 실패:', gattError);
        throw new Error(`GATT 연결 실패: ${gattError instanceof Error ? gattError.message : '알 수 없는 오류'}`);
      }

      // 서비스 가져오기
      console.log('[BLE] 서비스 가져오는 중...', SERVICE_UUID);
      let service;
      try {
        service = await server.getPrimaryService(SERVICE_UUID);
        console.log('[BLE] 서비스 가져옴');
      } catch (serviceError) {
        console.error('[BLE] 서비스 가져오기 실패:', serviceError);
        throw new Error(`서비스 발견 실패: ${serviceError instanceof Error ? serviceError.message : '알 수 없는 오류'}`);
      }

      // Characteristic 가져오기
      console.log('[BLE] Characteristic 가져오는 중...', CHARACTERISTIC_UUID);
      let characteristic;
      try {
        characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
        console.log('[BLE] Characteristic 가져옴');
      } catch (charError) {
        console.error('[BLE] Characteristic 가져오기 실패:', charError);
        throw new Error(`Characteristic 발견 실패: ${charError instanceof Error ? charError.message : '알 수 없는 오류'}`);
      }
      characteristicRef.current = characteristic;

      setConnectionStatus('connected');
      console.log('[BLE] 연결 완료!');
    } catch (error) {
      console.error('[BLE] 연결 에러:', error);

      if (error instanceof Error) {
        if (error.message.includes('User cancelled')) {
          setErrorMessage('연결이 취소되었습니다');
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage('BLE 연결 실패');
      }
      setConnectionStatus('error');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    deviceRef.current = null;
    characteristicRef.current = null;
    setConnectionStatus('disconnected');
    setErrorMessage(null);
  }, []);

  const sendDispenseCommand = useCallback(async (): Promise<boolean> => {
    if (connectionStatus !== 'connected' || !characteristicRef.current) {
      setErrorMessage('ESP32가 연결되지 않았습니다.');
      return false;
    }

    try {
      const encoder = new TextEncoder();
      await characteristicRef.current.writeValue(encoder.encode('DISPENSE'));

      // 응답 읽기
      const value = await characteristicRef.current.readValue();
      const decoder = new TextDecoder();
      const response = decoder.decode(value);

      if (response === 'COOLDOWN') {
        setErrorMessage('쿨다운 중 (2초 대기)');
        return false;
      }

      return response === 'OK';
    } catch (error) {
      console.error('BLE dispense error:', error);
      setErrorMessage('배출 명령 전송 실패');
      return false;
    }
  }, [connectionStatus]);

  return {
    connectionStatus,
    connect,
    disconnect,
    sendDispenseCommand,
    errorMessage,
  };
}
