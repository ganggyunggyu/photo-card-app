'use client';

type BLEConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface BLEConnectionProps {
  connectionStatus: BLEConnectionStatus;
  onConnect: () => void;
  onDisconnect: () => void;
  errorMessage: string | null;
}

export function BLEConnection({
  connectionStatus,
  onConnect,
  onDisconnect,
  errorMessage,
}: BLEConnectionProps) {
  const statusConfig: Record<BLEConnectionStatus, { color: string; bgColor: string }> = {
    disconnected: { color: 'bg-gray-400', bgColor: 'bg-gray-100' },
    connecting: { color: 'bg-yellow-400 animate-pulse', bgColor: 'bg-yellow-50' },
    connected: { color: 'bg-green-500', bgColor: 'bg-green-50' },
    error: { color: 'bg-red-500', bgColor: 'bg-red-50' },
  };

  const { color, bgColor } = statusConfig[connectionStatus];

  return (
    <div className={`${bgColor} rounded-full shadow-lg px-3 py-2 flex items-center gap-2`}>
      <div className={`w-3 h-3 rounded-full ${color}`} />
      {connectionStatus === 'connected' ? (
        <button
          onClick={onDisconnect}
          className="text-xs font-medium text-gray-600 hover:text-gray-800"
        >
          연결됨
        </button>
      ) : (
        <button
          onClick={onConnect}
          disabled={connectionStatus === 'connecting'}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          {connectionStatus === 'connecting' ? '연결중...' : '연결'}
        </button>
      )}
    </div>
  );
}
