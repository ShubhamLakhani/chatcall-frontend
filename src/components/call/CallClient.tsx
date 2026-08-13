'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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
  
  // Resolve whether we are in a voice-call or video-call
  const moduleType = (searchParams.get('type') || 'voice-call') as 'voice-call' | 'video-call';

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

  // Video element references
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const {
    isMuted,
    toggleMute,
    isVideoEnabled,
    toggleVideo,
    remoteAudioRef,
    remoteStream,
    localStream,
  } = useWebRTC({
    chatRoomId,
    userId,
    isInitiator,
    enableVideo: moduleType === 'video-call',
  });

  // Track initial call start time and join room when established
  useEffect(() => {
    if (chatRoomId) {
      setCallStartTime(Date.now());
      socket.emit('join-room', { chatRoomId });
    } else {
      setCallStartTime(null);
    }
  }, [chatRoomId]);

  // Bind local video stream to element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Bind remote video stream to element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

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

  // Listen for real-time icebreaker shuffles from matched partner
  useEffect(() => {
    const handleNewIcebreaker = (data: { icebreaker: string }) => {
      console.log('[SOCKET] New icebreaker received:', data.icebreaker);
      setIcebreaker(data.icebreaker);
    };

    socket.on('new-icebreaker', handleNewIcebreaker);
    return () => {
      socket.off('new-icebreaker', handleNewIcebreaker);
    };
  }, []);

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
    socket.emit('find-match', { moduleType, deviceId: deviceInfo?.visitorId });
  };

  // Listen for match outcomes
  useEffect(() => {
    const handleMatched = (data: {
      chatRoomId: string;
      initiator: boolean;
      icebreaker?: string;
      partner?: { _id: string; username: string };
    }) => {
      console.log('[MATCHED] Found new partner:', data.chatRoomId);
      setIsSearching(false);
      setIcebreaker(data.icebreaker || '');
      setPartner(data.partner || null);
      setIsFriendRequested(false);
      setCallStartTime(Date.now());
      router.replace(`/call?room=${data.chatRoomId}&initiator=${data.initiator}&type=${moduleType}`);
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
  }, [router, moduleType]);

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
        socket.emit('find-match', { moduleType, deviceId: deviceInfo?.visitorId });
      } else {
        router.push('/');
      }
    };

    socket.on('leave-room', handleLeaveRoom);
    return () => {
      socket.off('leave-room', handleLeaveRoom);
    };
  }, [chatRoomId, isAutoCall, deviceInfo, callStartTime, router, moduleType]);

  // Handle sending friend request
  const handleAddFriend = () => {
    if (partner) {
      console.log(`[FRIEND] Sending friend request to User ID: ${partner._id}`);
      socket.emit('send-friend-request', { targetUserId: partner._id });
      setIsFriendRequested(true);
      alert('Friend request sent! ❤️');
    }
  };

  const handleShuffleIcebreaker = () => {
    if (chatRoomId) {
      socket.emit('request-new-icebreaker', { chatRoomId });
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
  }, [chatRoomId, callStartTime, moduleType]);

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
  }, [chatRoomId, callStartTime, moduleType]);

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
      <div className="flex flex-col justify-center items-center h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black text-white px-4">
        <div className="relative flex h-24 w-24 justify-center items-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-14 w-14 bg-indigo-500 justify-center items-center text-3xl shadow-lg shadow-indigo-500/50">🛰</span>
        </div>
        <h2 className="text-2xl font-bold mt-8 mb-2 animate-pulse">Looking for a partner...</h2>
        <p className="text-sm text-zinc-400">Press Spacebar or Swipe to Skip</p>
        <button
          onClick={() => router.push('/')}
          className="mt-8 px-6 py-2 bg-rose-500/30 hover:bg-rose-600 border border-rose-500/50 text-white rounded-full transition-all text-xs font-bold uppercase tracking-wider"
        >
          Cancel Search
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between items-center h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black px-4 py-6 relative overflow-hidden text-white">
      
      {/* Immersive Video Chat stream components */}
      {moduleType === 'video-call' && (
        <div className="absolute inset-0 w-full h-full z-0 flex items-center justify-center bg-black/50">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-500">
              <div className="text-4xl animate-bounce mb-3">📹</div>
              <p className="text-sm font-semibold">Connecting video stream...</p>
            </div>
          )}

          {/* Floating Local PiP camera preview */}
          {localStream && (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-28 right-6 w-28 sm:w-32 h-36 sm:h-44 rounded-2xl border border-white/20 shadow-2xl object-cover z-20 hover:scale-105 transition-transform"
            />
          )}
        </div>
      )}

      {/* Floating Icebreaker starter */}
      <IcebreakerPrompt prompt={icebreaker} onShuffle={handleShuffleIcebreaker} />

      <div className="flex flex-col items-center mt-10 z-10 bg-black/30 border border-white/5 backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg">
        <h2 className="text-[10px] sm:text-xs uppercase tracking-widest font-extrabold text-indigo-400">
          In a {moduleType === 'video-call' ? 'Video Call' : 'Voice Call'}
        </h2>
        <p className="text-xs sm:text-sm font-bold text-zinc-200 mt-0.5">
          Chatting with: <span className="text-indigo-400">{partner ? partner.username : 'Anonymous'}</span>
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center z-10 w-full">
        {moduleType === 'voice-call' ? (
          <>
            <CallTimer active={true} />
            <AudioVisualizer stream={remoteStream} />
          </>
        ) : (
          /* Small overlaid timer for clean video session monitoring */
          <div className="bg-black/40 border border-white/5 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-zinc-300 absolute top-28">
            <CallTimer active={true} />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs z-10">
        <CallControls
          isMuted={isMuted}
          onMuteToggle={toggleMute}
          onEndCall={handleEndCall}
          onSkip={handleSkip}
          onAddFriend={handleAddFriend}
          isFriendAdded={isFriendRequested}
          isVideoEnabled={isVideoEnabled}
          onVideoToggle={moduleType === 'video-call' ? toggleVideo : undefined}
        />
        <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-zinc-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm shadow-sm hover:scale-105 transition-transform select-none uppercase tracking-wider">
          <input
            type="checkbox"
            onChange={handleAutoCall}
            checked={isAutoCall}
            className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 h-3.5 w-3.5"
          />
          Auto-call on Disconnect
        </label>
      </div>

      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
    </div>
  );
}
