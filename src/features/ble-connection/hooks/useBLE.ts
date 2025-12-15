'use client';

import { useState, useCallback, useRef } from 'react';
import {
  BLE_SERVICE_UUID,
  BLE_WRITE_CHAR_UUID,
  BLE_COMMAND_PRINT,
} from '@shared/lib';

type BLEConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseBLE {
  connectionStatus: BLEConnectionStatus;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendPrintCommand: () => Promise<boolean>;
  errorMessage: string | null;
}

export function useBLE(): UseBLE {
  const [connectionStatus, setConnectionStatus] = useState<BLEConnectionStatus>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      setErrorMessage('Web Bluetooth이 지원되지 않습니다.');
      setConnectionStatus('error');
      return;
    }

    try {
      setConnectionStatus('connecting');
      setErrorMessage(null);

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_SERVICE_UUID] }],
      });

      deviceRef.current = device;

      device.addEventListener('gattserverdisconnected', () => {
        setConnectionStatus('disconnected');
        characteristicRef.current = null;
      });

      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('GATT 서버 연결 실패');
      }

      const service = await server.getPrimaryService(BLE_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(BLE_WRITE_CHAR_UUID);
      characteristicRef.current = characteristic;

      setConnectionStatus('connected');
    } catch (error) {
      console.error('BLE connection error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'BLE 연결 실패');
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
  }, []);

  const sendPrintCommand = useCallback(async (): Promise<boolean> => {
    if (!characteristicRef.current) {
      setErrorMessage('BLE가 연결되지 않았습니다.');
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(BLE_COMMAND_PRINT);
      await characteristicRef.current.writeValue(data);
      return true;
    } catch (error) {
      console.error('BLE send error:', error);
      setErrorMessage('트리거 전송 실패');
      return false;
    }
  }, []);

  return {
    connectionStatus,
    connect,
    disconnect,
    sendPrintCommand,
    errorMessage,
  };
}
