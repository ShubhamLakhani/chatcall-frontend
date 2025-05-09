'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import CallControls from '~/components/call/CallControls';
import CallTimer from '~/components/call/CallTimer';
import { useWebRTC } from '~/hooks/useWebRTC';
import { getSocket } from '~/libs/socket';

export default function CallPage() {
  const searchParams = useSearchParams();
  const chatRoomId = searchParams.get('room') || '';
  const isInitiator = searchParams.get('initiator') === 'true';
  const userId = ''; // TODO: get real socket.id or from auth
  const router = useRouter();
  const socket = getSocket();
  // const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  

  const { isMuted, toggleMute, remoteAudioRef } = useWebRTC({ chatRoomId, userId, isInitiator});

  const handleEndCall = () => {
    socket.emit('leave-room', { chatRoomId });
    router.push('/');
  }
  console.log({isMuted})

  return (
    <div className="flex flex-col justify-between items-center h-screen bg-indigo-50 px-4 py-6">
      <h2 className="text-xl font-semibold text-gray-700 mt-10">In a Call</h2>
      <p className="text-3xl font-bold text-indigo-700 mt-2">Room ID: {chatRoomId}</p>
      <CallTimer active={true} />
      <CallControls isMuted={isMuted} onMuteToggle={toggleMute} onEndCall={() => {
        router.push('/')
      }} />
      <audio ref={remoteAudioRef} autoPlay controls />
    </div>
  );
}
