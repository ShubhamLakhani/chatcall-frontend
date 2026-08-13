import React, { useEffect, useState } from 'react';
import { getSocket } from '~/libs/socket';

export default function LiveCounter() {
  const [metrics, setMetrics] = useState({ totalOnline: 1, searchingCount: 0 });

  useEffect(() => {
    const socket = getSocket();

    const handleMetricsUpdate = (data: { totalOnline: number; searchingCount: number }) => {
      setMetrics(data);
    };

    socket.on('live-users-count', handleMetricsUpdate);

    return () => {
      socket.off('live-users-count', handleMetricsUpdate);
    };
  }, []);

  return (
    <div className="flex items-center gap-4 px-3 py-1 bg-white/70 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm text-[10px] sm:text-xs font-semibold text-gray-700">
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span>{metrics.totalOnline} online</span>
      </div>
      {metrics.searchingCount > 0 && (
        <div className="flex items-center gap-1 text-indigo-600 border-l border-gray-200 pl-3">
          <span className="animate-pulse text-indigo-500 font-bold">●</span>
          <span>{metrics.searchingCount} matching</span>
        </div>
      )}
    </div>
  );
}
