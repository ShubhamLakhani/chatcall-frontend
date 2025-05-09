'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import CallControls from '~/components/call/CallControls';
import CallTimer from '~/components/call/CallTimer';
import { useAppSelector } from '~/hooks/useAppSelector';
import { useWebRTC } from '~/hooks/useWebRTC';
import { getSocket } from '~/libs/socket';
import { RootState } from '~/store';
import WebRTCDebugPanel from './WebRTCDebugPanel';

export default function CallClient() {
  const searchParams = useSearchParams();
  const chatRoomId = searchParams.get('room') || '';
  const isInitiator = searchParams.get('initiator') === 'true';
  const userId = ''; // Placeholder if you have auth
  const router = useRouter();
  const socket = getSocket();
  const [isAutoCall, setIsAutoCall] = useState(false);
  const deviceInfo = useAppSelector((state: RootState) => state.auth.deviceInfo);

  const { isMuted, toggleMute, remoteAudioRef } = useWebRTC({ chatRoomId, userId, isInitiator });

  useEffect(() => {
    socket.on('leave-room', () => {
      handleEndCall();
    });
    return () => {
      socket.off('leave-room');
    };
  }, []);

  const handleAutoCall = () => {
    setIsAutoCall((prev) => !prev);
  };

  const handleEndCall = () => {
    socket.emit('leave-room', { chatRoomId });
    if (isAutoCall) {
      socket.emit('find-match', { deviceId: deviceInfo?.visitorId });
    } else {
      router.push('/');
    }
  };

  return (
    <div className="flex flex-col justify-between items-center h-screen bg-indigo-50 px-4 py-6">
      <h2 className="text-xl font-semibold text-gray-700 mt-10">In a Call</h2>
      <p className="text-3xl font-bold text-indigo-700 mt-2">Room ID: {chatRoomId}</p>
      <CallTimer active={true} />
      <CallControls isMuted={isMuted} onMuteToggle={toggleMute} onEndCall={handleEndCall} />
      <input type="checkbox" onChange={handleAutoCall} checked={isAutoCall} title="Enable auto call" />
      {/* <audio ref={remoteAudioRef} autoPlay controls /> */}
      <WebRTCDebugPanel remoteAudioRef={remoteAudioRef} />
    </div>
  );
}
