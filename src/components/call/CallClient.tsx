'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import CallControls from '~/components/call/CallControls';
import CallTimer from '~/components/call/CallTimer';
import AudioVisualizer from '~/components/call/AudioVisualizer';
import IcebreakerPrompt from '~/components/call/IcebreakerPrompt';
import GiftMenuModal from '~/components/call/GiftMenuModal';
import { useAppSelector } from '~/hooks/useAppSelector';
import { useAppDispatch } from '~/hooks/useAppDispatch';
import { updateUser } from '~/store/slices/authSlice';
import { useWebRTC } from '~/hooks/useWebRTC';
import { getSocket } from '~/libs/socket';
import { RootState } from '~/store';

interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  self?: boolean;
}

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
  const dispatch = useAppDispatch();
  
  const [isAutoCall, setIsAutoCall] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Floating Gift States
  interface FloatingGift {
    id: string;
    emoji: string;
    x: number;
  }
  const [floatingGifts, setFloatingGifts] = useState<FloatingGift[]>([]);
  const [giftToast, setGiftToast] = useState<{ senderName: string; giftName: string; giftEmoji: string } | null>(null);
  const [isGiftMenuOpen, setIsGiftMenuOpen] = useState(false);
  
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

  // In-Call Chat Overlay States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isChatOpenRef = useRef(isChatOpen);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
    if (isChatOpen) {
      setUnreadCount(0);
    }
  }, [isChatOpen]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

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

  // Scroll chat drawer to bottom on new messages
  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

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

  // Listen for in-call chat messages
  useEffect(() => {
    const handleReceiveMessage = (data: { content: string; sender: string }) => {
      if (data.sender === socket.id) return; // Skip duplicate self-message
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: data.content,
          sender: data.sender,
          timestamp: new Date().toISOString(),
          self: false,
        },
      ]);

      if (!isChatOpenRef.current) {
        setUnreadCount((c) => c + 1);
      }
    };

    socket.on('receive-message', handleReceiveMessage);
    return () => {
      socket.off('receive-message', handleReceiveMessage);
    };
  }, [socket]);

  // Listen for in-call virtual gifts
  useEffect(() => {
    const handleReceiveGift = (data: {
      giftId: string;
      giftEmoji: string;
      giftName: string;
      senderName: string;
      senderCoins: number;
      recipientCoins: number;
      senderSocketId: string;
      recipientSocketId: string;
    }) => {
      const id = Math.random().toString(36).substring(7);
      const x = Math.floor(Math.random() * 80) + 10; // 10% to 90%
      setFloatingGifts((prev) => [...prev, { id, emoji: data.giftEmoji, x }]);
      setTimeout(() => {
        setFloatingGifts((prev) => prev.filter((g) => g.id !== id));
      }, 4000);

      setGiftToast({
        senderName: data.senderName,
        giftName: data.giftName,
        giftEmoji: data.giftEmoji,
      });
      setTimeout(() => {
        setGiftToast(null);
      }, 3000);

      const isMeSender = socket.id === data.senderSocketId;
      const newBalance = isMeSender ? data.senderCoins : data.recipientCoins;
      dispatch(updateUser({ coins: newBalance }));
    };

    const handleGiftError = (data: { message: string }) => {
      alert(`Gift error: ${data.message}`);
    };

    socket.on('receive-gift', handleReceiveGift);
    socket.on('gift-error', handleGiftError);

    return () => {
      socket.off('receive-gift', handleReceiveGift);
      socket.off('gift-error', handleGiftError);
    };
  }, [socket, dispatch]);

  const handleSendGift = (giftId: string, giftCost: number, giftEmoji: string, giftName: string) => {
    socket.emit('send-gift', {
      chatRoomId,
      giftId,
      giftCost,
      giftEmoji,
      giftName,
    });
  };

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
    setChatMessages([]);
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
      setChatMessages([]);
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
      setChatMessages([]);
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

  const handleSendChatMessage = () => {
    if (!chatInput.trim() || !chatRoomId) return;

    socket.emit('send-message', {
      chatRoomId,
      content: chatInput.trim(),
    });

    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        content: chatInput.trim(),
        sender: socket.id || 'me',
        timestamp: new Date().toISOString(),
        self: true,
      },
    ]);

    setChatInput('');
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
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden w-full relative bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black text-white">
      
      {/* Floating animation keyframes styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes giftFloat {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          10% { opacity: 1; transform: translateY(-10vh) scale(1.2) rotate(10deg); }
          50% { transform: translateY(-45vh) scale(1.4) rotate(-10deg); }
          90% { opacity: 1; }
          100% { transform: translateY(-90vh) scale(0.8) rotate(0deg); opacity: 0; }
        }
        .animate-gift-float {
          animation: giftFloat 3.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}} />

      {/* Floating Gift Canvas overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
        {floatingGifts.map((gift) => (
          <div
            key={gift.id}
            style={{ left: `${gift.x}%` }}
            className="absolute bottom-0 text-5xl animate-gift-float opacity-0 select-none"
          >
            {gift.emoji}
          </div>
        ))}
      </div>

      {/* Gift Toast Notification Banner */}
      {giftToast && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 border border-purple-500/30 text-white font-extrabold text-xs px-4 py-2.5 rounded-full shadow-2xl z-40 animate-bounce flex items-center gap-2">
          <span>{giftToast.giftEmoji}</span>
          <span>{giftToast.senderName} sent a {giftToast.giftName}!</span>
        </div>
      )}

      {/* Flex Row (Video Stage + Chat Drawer) */}
      <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden relative">
        
        {/* Left Side: Video/Voice Stage (fills remaining width dynamically) */}
        <div className="flex-1 flex flex-col justify-between items-center px-4 py-6 relative overflow-hidden h-full">
          
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
              isChatOpen={isChatOpen}
              onChatToggle={() => {
                setIsChatOpen((prev) => {
                  const next = !prev;
                  if (next) {
                    setUnreadCount(0);
                  }
                  return next;
                });
              }}
              unreadCount={unreadCount}
              onGiftClick={() => setIsGiftMenuOpen(true)}
            />
            <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-zinc-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm shadow-sm hover:scale-105 transition-transform select-none uppercase tracking-wider">
              <input
                type="checkbox"
                onChange={handleAutoCall}
                checked={isAutoCall}
                className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 h-3.5 w-3.5"
              />
              <span>Auto-call on Disconnect</span>
            </label>
          </div>

        </div>

        {/* Right Side: Glassmorphic Chat Drawer */}
        {isChatOpen && (
          <div className="w-80 sm:w-96 h-full border-l border-white/10 bg-zinc-950/90 backdrop-blur-2xl flex flex-col justify-between shrink-0 min-h-0 overflow-hidden z-30 transition-all duration-300">
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-semibold text-white/90">In-Call Chat</h3>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 text-sm font-bold w-6 h-6 flex items-center justify-center transition-all"
              >
                ✕
              </button>
            </div>

            {/* Messages Feed (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.self ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-sm ${
                    msg.self
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none'
                      : 'bg-white/10 text-zinc-200 border border-white/10 rounded-bl-none'
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Fixed Input Form Bar at Bottom */}
            <div className="p-3 border-t border-white/10 bg-zinc-950/50 flex gap-2 shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50"
              />
              <button
                onClick={handleSendChatMessage}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 border border-indigo-500/20 text-white font-medium text-sm hover:opacity-90 transition-opacity rounded-xl"
              >
                Send
              </button>
            </div>
          </div>
        )}

      </div>

      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

      <GiftMenuModal
        isOpen={isGiftMenuOpen}
        onClose={() => setIsGiftMenuOpen(false)}
        onSendGift={handleSendGift}
      />
    </div>
  );
}
