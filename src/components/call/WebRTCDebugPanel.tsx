'use client';

import React, { useEffect, useState, RefObject } from 'react';

type TrackStatus = {
  enabled: boolean;
  muted: boolean;
  readyState: string;
};

type AudioStatus = {
  volume: number;
  muted: boolean;
  currentTime: number;
  srcObject: boolean;
};

declare global {
  interface Window {
    __webrtc_debug__?: {
      setRemoteTrackStatus: (status: TrackStatus) => void;
      setLocalTrackStatus: (status: TrackStatus) => void;
      pushICE: (type: string) => void;
    };
  }
}

const WebRTCDebugPanel = ({ remoteAudioRef }: { remoteAudioRef: RefObject<HTMLAudioElement | null> }) => {
  const [audioStatus, setAudioStatus] = useState<AudioStatus>({
    volume: 1,
    muted: false,
    currentTime: 0,
    srcObject: false,
  });
  const [remoteTrackStatus, setRemoteTrackStatus] = useState<TrackStatus | null>(null);
  const [localTrackStatus, setLocalTrackStatus] = useState<TrackStatus | null>(null);
  const [iceCandidates, setIceCandidates] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (remoteAudioRef.current) {
        const audio = remoteAudioRef.current;
        setAudioStatus({
          volume: audio.volume,
          muted: audio.muted,
          currentTime: audio.currentTime,
          srcObject: Boolean(audio.srcObject),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [remoteAudioRef]);

  useEffect(() => {
    window.__webrtc_debug__ = {
      setRemoteTrackStatus: (status: TrackStatus) => setRemoteTrackStatus(status),
      setLocalTrackStatus: (status: TrackStatus) => setLocalTrackStatus(status),
      pushICE: (type: string) => setIceCandidates((prev) => [...prev, type]),
    };
  }, []);

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
