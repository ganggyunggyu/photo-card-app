'use client';

import { useState, useCallback, useEffect } from 'react';

type ESPConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseESP32 {
  connectionStatus: ESPConnectionStatus;
  espIp: string;
  setEspIp: (ip: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendDispenseCommand: () => Promise<boolean>;
  errorMessage: string | null;
}

const ESP_IP_STORAGE_KEY = 'esp32_ip';
const DEFAULT_ESP_IP = '192.168.0.100';

export function useESP32(): UseESP32 {
  const [connectionStatus, setConnectionStatus] = useState<ESPConnectionStatus>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [espIp, setEspIpState] = useState<string>(DEFAULT_ESP_IP);

  useEffect(() => {
    const savedIp = localStorage.getItem(ESP_IP_STORAGE_KEY);
    if (savedIp) {
      setEspIpState(savedIp);
    }
  }, []);

  const setEspIp = useCallback((ip: string) => {
    setEspIpState(ip);
    localStorage.setItem(ESP_IP_STORAGE_KEY, ip);
    setConnectionStatus('disconnected');
  }, []);

  const connect = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      setErrorMessage(null);

      const response = await fetch(`/api/esp32?ip=${encodeURIComponent(espIp)}&endpoint=health`);

      if (response.status === 504) {
        throw new Error('연결 시간 초과 (5초)');
      }

      if (response.status === 502) {
        throw new Error('ESP32 연결 실패');
      }

      if (!response.ok) {
        throw new Error('ESP32 응답 실패');
      }

      const data = await response.json();
      if (data.ok) {
        setConnectionStatus('connected');
      } else {
        throw new Error('ESP32 상태 이상');
      }
    } catch (error) {
      console.error('ESP32 connection error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'ESP32 연결 실패');
      setConnectionStatus('error');
    }
  }, [espIp]);

  const disconnect = useCallback(() => {
    setConnectionStatus('disconnected');
    setErrorMessage(null);
  }, []);

  const sendDispenseCommand = useCallback(async (): Promise<boolean> => {
    if (connectionStatus !== 'connected') {
      setErrorMessage('ESP32가 연결되지 않았습니다.');
      return false;
    }

    try {
      const response = await fetch(`/api/esp32?ip=${encodeURIComponent(espIp)}&endpoint=dispense`, {
        method: 'POST',
      });

      if (response.status === 429) {
        setErrorMessage('쿨다운 중 (2초 대기)');
        return false;
      }

      if (response.status === 504) {
        setErrorMessage('명령 시간 초과');
        return false;
      }

      if (!response.ok) {
        throw new Error('배출 명령 실패');
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('ESP32 dispense error:', error);
      setErrorMessage('배출 명령 전송 실패');
      return false;
    }
  }, [connectionStatus, espIp]);

  return {
    connectionStatus,
    espIp,
    setEspIp,
    connect,
    disconnect,
    sendDispenseCommand,
    errorMessage,
  };
}
