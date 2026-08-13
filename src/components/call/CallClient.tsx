'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import CallControls from '~/components/call/CallControls';
import CallTimer from '~/components/call/CallTimer';
import AudioVisualizer from '~/components/call/AudioVisualizer';
import IcebreakerPrompt from '~/components/call/IcebreakerPrompt';
import { useAppSelector } from '~/hooks/useAppSelector';
import { useWebRTC } from '~/hooks/useWebRTC';
import { getSocket } from '~/libs/socket';
import { RootState } from '~/store';

export default function CallClient() {
  const searchParams = useSearchParams();
  const chatRoomId = searchParams.get('room') || '';
  const isInitiator = searchParams.get('initiator') === 'true';
  const initialPartnerId = searchParams.get('partnerId') || '';
  const initialPartnerName = searchParams.get('partnerName') || '';
  const initialIcebreaker = searchParams.get('icebreaker') || '';

  const userId = ''; // Placeholder if you have auth
  const router = useRouter();
  const socket = getSocket();
  
  const [isAutoCall, setIsAutoCall] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Initialize states using routed query variables to support initial match loading
  const [icebreaker, setIcebreaker] = useState(initialIcebreaker ? decodeURIComponent(initialIcebreaker) : '');
  const [partner, setPartner] = useState<{ _id: string; username: string } | null>(
    initialPartnerId
      ? {
          _id: initialPartnerId,
          username: initialPartnerName ? decodeURIComponent(initialPartnerName) : 'Anonymous',
        }
      : null
  );
  const [isFriendRequested, setIsFriendRequested] = useState(false);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);

  const deviceInfo = useAppSelector((state: RootState) => state.auth.deviceInfo);

  const { isMuted, toggleMute, remoteAudioRef, remoteStream } = useWebRTC({
    chatRoomId,
    userId,
    isInitiator,
    enableVideo: false,
  });

  // Track initial call start time when room is established
  useEffect(() => {
    if (chatRoomId) {
      setCallStartTime(Date.now());
    } else {
      setCallStartTime(null);
    }
  }, [chatRoomId]);

  // Interaction fallback to handle autoplay policy restrictions on incoming audio stream
  useEffect(() => {
    const resumeAudio = () => {
      if (remoteAudioRef.current && remoteStream) {
        remoteAudioRef.current.play()
          .then(() => {
            console.log('[AUDIO] Autoplay resumed on user interaction');
            window.removeEventListener('click', resumeAudio);
            window.removeEventListener('touchstart', resumeAudio);
          })
          .catch((err) => console.warn('[AUDIO] Failed to resume on interaction:', err));
      }
    };
    window.addEventListener('click', resumeAudio);
    window.addEventListener('touchstart', resumeAudio);
    return () => {
      window.removeEventListener('click', resumeAudio);
      window.removeEventListener('touchstart', resumeAudio);
    };
  }, [remoteStream, remoteAudioRef]);

  // Evaluates call length and requests rewards
  const evaluateCallReward = () => {
    if (callStartTime) {
      const durationSeconds = Math.floor((Date.now() - callStartTime) / 1000);
      console.log(`[REWARD] Evaluating call length: ${durationSeconds} seconds.`);
      if (durationSeconds >= 60) {
        socket.emit('reward-completed-call', { callDuration: durationSeconds });
      }
      setCallStartTime(null);
    }
  };

  // Handle instant skip action
  const handleSkip = () => {
    console.log('[SKIP] Skipping current call...');
    evaluateCallReward();
    socket.emit('leave-room', { chatRoomId });
    setPartner(null);
    setIsFriendRequested(false);
    setIcebreaker('');
    setIsSearching(true);
    socket.emit('find-match', { moduleType: 'voice-call', deviceId: deviceInfo?.visitorId });
  };

  // Listen for match outcomes
  useEffect(() => {
    const handleMatched = (data: {
      chatRoomId: string;
      initiator: boolean;
      icebreaker?: string;
      partner?: { _id: string; username: string };
    }) => {
      console.log('[MATCHED] Found new voice partner:', data.chatRoomId);
      setIsSearching(false);
      setIcebreaker(data.icebreaker || '');
      setPartner(data.partner || null);
      setIsFriendRequested(false);
      setCallStartTime(Date.now());
      router.replace(`/call?room=${data.chatRoomId}&initiator=${data.initiator}`);
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
      evaluateCallReward();
      setPartner(null);
      setIsFriendRequested(false);
      setIcebreaker('');
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
  }, [chatRoomId, isAutoCall, deviceInfo, callStartTime, router]);

  // Handle sending friend request
  const handleAddFriend = () => {
    if (partner) {
      console.log(`[FRIEND] Sending friend request to User ID: ${partner._id}`);
      socket.emit('send-friend-request', { targetUserId: partner._id });
      setIsFriendRequested(true);
      alert('Friend request sent! ❤️');
    }
  };

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
  }, [chatRoomId, callStartTime]);

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
  }, [chatRoomId, callStartTime]);

  const handleAutoCall = () => {
    setIsAutoCall((prev) => !prev);
  };

  const handleEndCall = () => {
    evaluateCallReward();
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
    <div className="flex flex-col justify-between items-center h-screen bg-indigo-50 px-4 py-6 relative overflow-hidden">
      {/* Floating Icebreaker starter */}
      <IcebreakerPrompt prompt={icebreaker} />

      <div className="flex flex-col items-center mt-10 z-10">
        <h2 className="text-sm uppercase tracking-widest font-bold text-indigo-400/80">In a Voice Call</h2>
        <p className="text-base font-bold text-gray-700 mt-1">
          Chatting with: <span className="text-indigo-600">{partner ? partner.username : 'Anonymous'}</span>
        </p>
        <p className="text-[10px] text-gray-400 mt-1">Room: {chatRoomId}</p>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center z-10">
        <CallTimer active={true} />
        <AudioVisualizer stream={remoteStream} />
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-xs z-10">
        <CallControls
          isMuted={isMuted}
          onMuteToggle={toggleMute}
          onEndCall={handleEndCall}
          onSkip={handleSkip}
          onAddFriend={handleAddFriend}
          isFriendAdded={isFriendRequested}
        />
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-500 mb-6 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm hover:scale-105 transition-transform select-none">
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
