'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import CallControls from '~/components/call/CallControls';
import CallTimer from '~/components/call/CallTimer';
import AudioVisualizer from '~/components/call/AudioVisualizer';
import { useAppSelector } from '~/hooks/useAppSelector';
import { useWebRTC } from '~/hooks/useWebRTC';
import { getSocket } from '~/libs/socket';
import { RootState } from '~/store';

export default function CallClient() {
  const searchParams = useSearchParams();
  const chatRoomId = searchParams.get('room') || '';
  const isInitiator = searchParams.get('initiator') === 'true';
  const userId = ''; // Placeholder if you have auth
  const router = useRouter();
  const socket = getSocket();
  const [isAutoCall, setIsAutoCall] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const deviceInfo = useAppSelector((state: RootState) => state.auth.deviceInfo);

  const { isMuted, toggleMute, remoteAudioRef, remoteStream } = useWebRTC({
    chatRoomId,
    userId,
    isInitiator,
    enableVideo: false,
  });

  // Handle instant skip action
  const handleSkip = () => {
    console.log('[SKIP] Skipping current call...');
    socket.emit('leave-room', { chatRoomId });
    setIsSearching(true);
    socket.emit('find-match', { moduleType: 'voice-call' });
  };

  // Listen for match outcomes
  useEffect(() => {
    const handleMatched = ({ chatRoomId: newRoomId, initiator }: { chatRoomId: string; initiator: boolean }) => {
      console.log('[MATCHED] Found new voice partner:', newRoomId);
      setIsSearching(false);
      router.replace(`/call?room=${newRoomId}&initiator=${initiator}`);
    };

    const handleWaiting = () => {
      setIsSearching(true);
    };

    socket.on('matched', handleMatched);
    socket.on('waiting', handleWaiting);

    return () => {
      socket.off('matched', handleMatched);
      socket.off('waiting', handleWaiting);
    };
  }, [router]);

  // Clean up and disconnect if partner leaves
  useEffect(() => {
    const handleLeaveRoom = () => {
      console.log('[ROOM] Partner left call.');
      if (isAutoCall) {
        setIsSearching(true);
        socket.emit('find-match', { moduleType: 'voice-call', deviceId: deviceInfo?.visitorId });
      } else {
        router.push('/');
      }
    };

    socket.on('leave-room', handleLeaveRoom);
    return () => {
      socket.off('leave-room', handleLeaveRoom);
    };
  }, [chatRoomId, isAutoCall, deviceInfo, router]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.code === 'Space' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [chatRoomId]);

  // Mobile Swipe Gestures
  useEffect(() => {
    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX;
      const swipeDistance = touchStartX - touchEndX;
      if (Math.abs(swipeDistance) > 100) {
        handleSkip();
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [chatRoomId]);

  const handleAutoCall = () => {
    setIsAutoCall((prev) => !prev);
  };

  const handleEndCall = () => {
    socket.emit('leave-room', { chatRoomId });
    router.push('/');
  };

  if (isSearching) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-indigo-950 text-white px-4">
        <div className="relative flex h-24 w-24 justify-center items-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-14 w-14 bg-indigo-500 justify-center items-center text-3xl shadow-lg shadow-indigo-500/50">🛰</span>
        </div>
        <h2 className="text-2xl font-bold mt-8 mb-2 animate-pulse">Looking for a partner...</h2>
        <p className="text-sm text-indigo-300">Press Spacebar or Swipe to Skip</p>
        <button
          onClick={() => router.push('/')}
          className="mt-8 px-6 py-2 bg-red-600/30 hover:bg-red-600 border border-red-500/50 text-white rounded-full transition-all text-xs font-bold uppercase tracking-wider"
        >
          Cancel Search
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between items-center h-screen bg-indigo-50 px-4 py-6">
      <div className="flex flex-col items-center mt-10">
        <h2 className="text-sm uppercase tracking-widest font-bold text-gray-400">In a Voice Call</h2>
        <p className="text-xs text-gray-500 mt-1">Room ID: {chatRoomId}</p>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center">
        <CallTimer active={true} />
        <AudioVisualizer stream={remoteStream} />
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <CallControls
          isMuted={isMuted}
          onMuteToggle={toggleMute}
          onEndCall={handleEndCall}
          onSkip={handleSkip}
        />
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-500 mb-6 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
          <input
            type="checkbox"
            onChange={handleAutoCall}
            checked={isAutoCall}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
          />
          Auto-call on Disconnect
        </label>
      </div>

      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
    </div>
  );
}
