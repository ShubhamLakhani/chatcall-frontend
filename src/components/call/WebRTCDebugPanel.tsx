import React, { useEffect, useState } from 'react';

const WebRTCDebugPanel = ({ remoteAudioRef }: { remoteAudioRef: React.RefObject<HTMLAudioElement | null> }) => {
  const [audioStatus, setAudioStatus] = useState<any>({});
  const [remoteTrackStatus, setRemoteTrackStatus] = useState<any>({});
  const [localTrackStatus, setLocalTrackStatus] = useState<any>({});
  const [iceCandidates, setIceCandidates] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (remoteAudioRef.current) {
        setAudioStatus({
          volume: remoteAudioRef.current.volume,
          muted: remoteAudioRef.current.muted,
          currentTime: remoteAudioRef.current.currentTime,
          srcObject: !!remoteAudioRef.current.srcObject,
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [remoteAudioRef]);

  // Make these available globally for your hook to update (bad practice, but helpful for quick debugging)
  (window as any).__webrtc_debug__ = {
    setRemoteTrackStatus,
    setLocalTrackStatus,
    pushICE: (type: string) => setIceCandidates((prev) => [...prev, type]),
  };

  return (
    <div style={{ position: 'fixed', bottom: 0, right: 0, padding: 12, background: '#111', color: '#0f0', fontSize: 12, zIndex: 1000 }}>
      <strong>WebRTC Debug</strong>
      <pre>🎧 Audio: {JSON.stringify(audioStatus, null, 2)}</pre>
      <pre>📥 Remote Track: {JSON.stringify(remoteTrackStatus, null, 2)}</pre>
      <pre>🎤 Local Track: {JSON.stringify(localTrackStatus, null, 2)}</pre>
      <pre>❄️ ICE Types: {iceCandidates.join(', ')}</pre>
    </div>
  );
};

export default WebRTCDebugPanel;
