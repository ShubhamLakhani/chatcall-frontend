'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSocket } from '~/libs/socket';
import { useTypingIndicator } from '~/hooks/useTypingIndicator';
import { useSeenTracking } from '~/hooks/useSeenTracking';

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
  const chatRoomId = searchParams.get('room')!;
  const isInitiator = searchParams.get('initiator') === 'true';

  const socket = getSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatBoxRef = useRef<HTMLDivElement | null>(null);
  const userId = socket.id || 'unknown';
  const router = useRouter();

  const { typingUserId, emitTyping } = useTypingIndicator(chatRoomId, userId);
  useSeenTracking(chatRoomId, userId, () => {
    setMessages((prev) =>
      prev.map((msg) =>
        !msg.self ? { ...msg, seen: true } : msg
      )
    );
  });

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchOldMessages = () => {
    if (!hasMore) return;
    // Simulated API
    setTimeout(() => {
      const olderMessages: Message[] = Array.from({ length: 10 }).map((_, i) => ({
        id: `old-${Date.now()}-${i}`,
        content: `Old message ${i + 1}`,
        sender: 'other-user',
        timestamp: new Date(Date.now() - (i + 1) * 60000).toISOString(),
        self: false,
        seen: true,
      }));
      setMessages((prev) => [...olderMessages, ...prev]);
      setHasMore(false); // For demo only
    }, 500);
  };

  const handleScroll = () => {
    if (chatBoxRef.current && chatBoxRef.current.scrollTop === 0) {
      fetchOldMessages();
    }
  };

  useEffect(() => {
    if (!chatRoomId) return;

    socket.on('receive-message', (data: { content: string; sender: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          ...data,
          timestamp: new Date().toISOString(),
          self: false,
        },
      ]);
    });

    return () => {
      socket.off('receive-message');
    };
  }, [chatRoomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    // if (isAutoCall) {
    //   socket.emit('find-match', { deviceId: deviceInfo?.visitorId });
    // } else {
      router.push('/');
    // }
  };

  useEffect(() => {
    socket.on('leave-room', () => {
        handleEndChat();
    });
    return () => {
      socket.off('leave-room');
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white px-4 py-6">
      <h2 className="text-xl font-semibold mb-2 text-center text-gray-800">Chat Room</h2>
      <div
        className="flex-1 overflow-y-auto bg-gray-50 p-4 rounded border"
        ref={chatBoxRef}
        onScroll={handleScroll}
      >
        {messages.map((msg, idx) => (
          <div key={msg.id} className="mb-2">
            <div
              className={`p-2 rounded max-w-xs text-sm ${
                msg.self
                  ? 'ml-auto bg-blue-500 text-white'
                  : msg.sender === 'system'
                  ? 'text-center text-gray-400 text-sm'
                  : 'mr-auto bg-gray-200 text-gray-800'
              }`}
            >
              {msg.content}
            </div>
            <div
              className={`text-[10px] mt-0.5 ${msg.self ? 'text-right text-blue-400' : 'text-left text-gray-400'}`}
            >
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {msg.self && <span className="ml-1">{msg.seen ? '👀' : '✅'}</span>}
            </div>
          </div>
        ))}

        {typingUserId && typingUserId !== userId && (
          <div className="text-sm text-gray-500 italic mt-2">Partner is typing...
            <span className="ml-1 animate-pulse">...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          className="flex-1 border border-gray-300 rounded px-3 py-2"
          placeholder="Type a message"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            emitTyping();
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Send
        </button>
        <button
          onClick={handleEndChat}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          End
        </button>
      </div>
    </div>
  );
}
