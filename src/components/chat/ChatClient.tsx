'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSocket } from '~/libs/socket';
import { useTypingIndicator } from '~/hooks/useTypingIndicator';
import { useSeenTracking } from '~/hooks/useSeenTracking';
import IcebreakerPrompt from '~/components/call/IcebreakerPrompt';
import { useAppSelector } from '~/hooks/useAppSelector';
import { RootState } from '~/store';

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  self?: boolean;
  seen?: boolean;
}

export default function ChatClient() {
  const searchParams = useSearchParams();
  const chatRoomId = searchParams.get('room') || '';
  const initialPartnerId = searchParams.get('partnerId') || '';
  const initialPartnerName = searchParams.get('partnerName') || '';
  const initialIcebreaker = searchParams.get('icebreaker') || '';

  const router = useRouter();
  const socket = getSocket();
  const deviceInfo = useAppSelector((state: RootState) => state.auth.deviceInfo);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [hasMore, setHasMore] = useState(true);
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

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatBoxRef = useRef<HTMLDivElement | null>(null);
  const userId = socket.id || 'unknown';

  const { typingUserId, emitTyping } = useTypingIndicator(chatRoomId, userId);
  
  useSeenTracking(chatRoomId, userId, () => {
    setMessages((prev) =>
      prev.map((msg) => (!msg.self ? { ...msg, seen: true } : msg))
    );
  });

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchOldMessages = () => {
    if (!hasMore) return;
    setTimeout(() => {
      const olderMessages: Message[] = Array.from({ length: 10 }).map(
        (_, i) => ({
          id: `old-${Date.now()}-${i}`,
          content: `Old message ${i + 1}`,
          sender: 'other-user',
          timestamp: new Date(Date.now() - (i + 1) * 60000).toISOString(),
          self: false,
          seen: true,
        })
      );
      setMessages((prev) => [...olderMessages, ...prev]);
      setHasMore(false);
    }, 500);
  };

  const handleScroll = () => {
    if (chatBoxRef.current && chatBoxRef.current.scrollTop === 0) {
      fetchOldMessages();
    }
  };

  // Join the Socket.IO room channel on mount/room changes
  useEffect(() => {
    if (chatRoomId) {
      socket.emit('join-room', { chatRoomId });
    }
  }, [chatRoomId]);

  // Instant skip method
  const handleSkip = () => {
    console.log('[SKIP] Skipping current chat...');
    socket.emit('leave-room', { chatRoomId });
    setMessages([]);
    setInput('');
    setPartner(null);
    setIsFriendRequested(false);
    setIcebreaker('');
    setIsSearching(true);
    socket.emit('find-match', { moduleType: 'chat', deviceId: deviceInfo?.visitorId });
  };

  // Listen for match events
  useEffect(() => {
    const handleMatched = (data: {
      chatRoomId: string;
      initiator: boolean;
      icebreaker?: string;
      partner?: { _id: string; username: string };
    }) => {
      console.log('[MATCHED] Found new chat partner:', data.chatRoomId);
      setIsSearching(false);
      setIcebreaker(data.icebreaker || '');
      setPartner(data.partner || null);
      setIsFriendRequested(false);
      router.replace(`/chat?room=${data.chatRoomId}&initiator=${data.initiator}`);
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

  // Handle incoming messages
  useEffect(() => {
    if (!chatRoomId) return;

    const handleReceiveMessage = (data: { content: string; sender: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          ...data,
          timestamp: new Date().toISOString(),
          self: false,
        },
      ]);
    };

    socket.on('receive-message', handleReceiveMessage);

    return () => {
      socket.off('receive-message', handleReceiveMessage);
    };
  }, [chatRoomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message
  const handleSend = () => {
    if (!input.trim()) return;

    socket.emit('send-message', {
      chatRoomId,
      content: input.trim(),
    });

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        content: input.trim(),
        sender: userId,
        timestamp: new Date().toISOString(),
        self: true,
        seen: false,
      },
    ]);

    setInput('');
  };

  const handleEndChat = () => {
    socket.emit('leave-room', { chatRoomId });
    router.push('/');
  };

  // Clean up if partner leaves
  useEffect(() => {
    const handleLeaveRoom = () => {
      console.log('[ROOM] Partner left chat.');
      setPartner(null);
      setIsFriendRequested(false);
      setIcebreaker('');
      router.push('/');
    };

    socket.on('leave-room', handleLeaveRoom);
    return () => {
      socket.off('leave-room', handleLeaveRoom);
    };
  }, [chatRoomId, router]);

  // Handle friend requests
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
  }, [chatRoomId]);

  // Mobile Swiping Gestures
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

  if (isSearching) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black text-white px-4">
        <div className="relative flex h-24 w-24 justify-center items-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-14 w-14 bg-indigo-500 justify-center items-center text-3xl shadow-lg shadow-indigo-500/50">💬</span>
        </div>
        <h2 className="text-2xl font-bold mt-8 mb-2 animate-pulse">Finding a partner...</h2>
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
    <div className="flex flex-col h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black px-4 py-6 relative overflow-hidden text-white">
      {/* Conversation Icebreaker Prompts */}
      <IcebreakerPrompt prompt={icebreaker} onShuffle={handleShuffleIcebreaker} />

      <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-3 z-10">
        <div className="text-left">
          <h2 className="text-[10px] sm:text-xs uppercase tracking-widest font-extrabold text-indigo-400">Text Chat Room</h2>
          <p className="text-sm font-bold text-zinc-200 mt-0.5">
            Chatting with: <span className="text-indigo-400">{partner ? partner.username : 'Anonymous'}</span>
          </p>
        </div>
        <p className="text-[10px] text-zinc-500">Room: {chatRoomId}</p>
      </div>

      <div
        className="flex-1 overflow-y-auto bg-white/5 border border-white/10 p-4 rounded-2xl shadow-inner z-10"
        ref={chatBoxRef}
        onScroll={handleScroll}
      >
        {messages.map((msg) => (
          <div key={msg.id} className="mb-3">
            <div
              className={`p-3 rounded-xl max-w-xs text-xs sm:text-sm shadow-md ${
                msg.self
                  ? 'ml-auto bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-tr-none'
                  : msg.sender === 'system'
                  ? 'text-center text-zinc-500 text-[10px] bg-transparent shadow-none'
                  : 'mr-auto bg-white/10 text-zinc-100 border border-white/5 rounded-tl-none'
              }`}
            >
              {msg.content}
            </div>
            <div
              className={`text-[9px] mt-0.5 px-1 ${
                msg.self ? 'text-right text-indigo-400' : 'text-left text-zinc-500'
              }`}
            >
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {msg.self && <span className="ml-1">{msg.seen ? '👀' : '✓'}</span>}
            </div>
          </div>
        ))}

        {typingUserId && typingUserId !== userId && (
          <div className="text-xs text-indigo-400 italic mt-2 animate-pulse flex items-center gap-1">
            <span>Partner is typing</span>
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-75"></span>
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
            </span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="mt-4 flex flex-wrap sm:flex-nowrap items-center gap-2 z-10">
        <input
          className="flex-1 border border-white/10 bg-white/5 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[200px]"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            emitTyping();
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <div className="flex gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
          <button
            onClick={handleSend}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 border border-indigo-500/20 text-white px-4 py-2.5 rounded-xl hover:from-indigo-600 hover:to-purple-700 font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 shrink-0"
          >
            Send
          </button>
          {partner && (
            <button
              onClick={handleAddFriend}
              disabled={isFriendRequested}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all border shrink-0 ${
                isFriendRequested
                  ? 'bg-pink-500/20 border-pink-500/40 text-pink-300 cursor-not-allowed'
                  : 'bg-white/5 border-white/10 text-pink-400 hover:bg-pink-500/20 hover:border-pink-500/30'
              }`}
            >
              {isFriendRequested ? 'Friends ❤️' : 'Add Friend ♡'}
            </button>
          )}
          <button
            onClick={handleSkip}
            className="bg-gradient-to-r from-amber-500 to-orange-600 border border-amber-500/20 text-white px-4 py-2.5 rounded-xl hover:from-amber-600 hover:to-orange-700 font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 shrink-0"
            title="Skip to next match (Spacebar)"
          >
            Skip
          </button>
          <button
            onClick={handleEndChat}
            className="bg-white/5 border border-white/10 hover:border-rose-500/30 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0"
          >
            End
          </button>
        </div>
      </div>
    </div>
  );
}
