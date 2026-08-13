'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '~/hooks/useAppSelector';
import { getSocket } from '~/libs/socket';
import { RootState } from '~/store';

export default function HomePage() {
  const router = useRouter();
  const socketRef = useRef<ReturnType<typeof getSocket>>(getSocket());
  const [isMatching, setIsMatching] = useState(false);
  const [matchType, setMatchType] = useState<'voice-call' | 'chat' | 'video-call' | null>(null);
  const deviceInfo = useAppSelector((state: RootState) => state.auth.deviceInfo);

  console.log('Device Info:', deviceInfo);

  useEffect(() => {
    const socket = socketRef.current;

    if (socket.connected) {
      console.log('Socket is connected:', socket.id);
    }

    socket.on('waiting', () => {
      console.log('Waiting for match...');
      setIsMatching(true);
    });

    socket.on('matched', ({ chatRoomId, initiator, moduleType, icebreaker, partner }) => {
      console.log('Matched with a user:', chatRoomId, initiator, moduleType);
      setIsMatching(false);
      
      const partnerId = partner?._id || '';
      const partnerName = partner?.username || '';
      const encodedIcebreaker = encodeURIComponent(icebreaker || '');
      const encodedPartnerName = encodeURIComponent(partnerName);

      if (moduleType === 'chat') {
        router.push(`/chat?room=${chatRoomId}&initiator=${initiator}&partnerId=${partnerId}&partnerName=${encodedPartnerName}&icebreaker=${encodedIcebreaker}`);
      } else {
        router.push(`/call?room=${chatRoomId}&initiator=${initiator}&type=${moduleType}&partnerId=${partnerId}&partnerName=${encodedPartnerName}&icebreaker=${encodedIcebreaker}`);
      }
    });

    return () => {
      socket.off('waiting');
      socket.off('matched');
    };
  }, [router, matchType]);

  const handleStartVoiceCall = () => {
    if (!socketRef.current) return;
    setIsMatching(true);
    setMatchType('voice-call');
    if (deviceInfo) {
      socketRef.current.emit('find-match', { deviceId: deviceInfo.visitorId, moduleType: 'voice-call' });
    } else {
      console.error('Device info is not available.');
    }
  };

  const handleStartTextChat = () => {
    if (!socketRef.current) return;
    setIsMatching(true);
    setMatchType('chat');
    if (deviceInfo) {
      socketRef.current.emit('find-match', { deviceId: deviceInfo.visitorId, moduleType: 'chat' });
    } else {
      console.error('Device info is not available.');
    }
  };

  const handleStartVideoCall = () => {
    if (!socketRef.current) return;
    setIsMatching(true);
    setMatchType('video-call');
    if (deviceInfo) {
      socketRef.current.emit('find-match', { deviceId: deviceInfo.visitorId, moduleType: 'video-call' });
    } else {
      console.error('Device info is not available.');
    }
  };

  const handleCancelSearch = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('leave-room', {}); // cancel queue
    setIsMatching(false);
    setMatchType(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="text-center max-w-xl z-10 mb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
          Cashual Call
        </h1>
        <p className="text-zinc-400 text-base leading-relaxed">
          Connect instantly and anonymously with real people. Select a communication mode below to start matchmaking.
        </p>
      </div>

      {isMatching ? (
        <div className="z-10 flex flex-col items-center justify-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-pulse">
          <div className="relative flex h-16 w-16 mb-6 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-10 w-10 bg-indigo-600 justify-center items-center text-xl shadow-lg shadow-indigo-600/50">🛰</span>
          </div>
          <h2 className="text-lg font-bold mb-1">Searching for a partner...</h2>
          <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">{matchType?.replace('-', ' ')} Mode</p>
          <button
            onClick={handleCancelSearch}
            className="mt-6 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-md active:scale-95"
          >
            Cancel Matchmaking
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full z-10">
          {/* Card 1: Text Chat */}
          <div
            onClick={handleStartTextChat}
            className="group flex flex-col justify-between p-6 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-indigo-500/50 rounded-3xl cursor-pointer transition-all duration-300 shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 select-none"
          >
            <div>
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">💬</div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-indigo-400 transition-colors">Text Chat</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Connect instantly through anonymous text messaging. Perfect for quick and safe casual talk.
              </p>
            </div>
            <div className="mt-8 text-xs font-bold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1">
              Start chat <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* Card 2: Voice Call */}
          <div
            onClick={handleStartVoiceCall}
            className="group flex flex-col justify-between p-6 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-purple-500/50 rounded-3xl cursor-pointer transition-all duration-300 shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 select-none"
          >
            <div>
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">🎙️</div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-purple-400 transition-colors">Voice Call</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Talk directly to partners using clean audio with an active, canvas-rendered voice visualizer.
              </p>
            </div>
            <div className="mt-8 text-xs font-bold text-purple-400 group-hover:text-purple-300 flex items-center gap-1">
              Start voice <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* Card 3: Video Call */}
          <div
            onClick={handleStartVideoCall}
            className="group flex flex-col justify-between p-6 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-pink-500/50 rounded-3xl cursor-pointer transition-all duration-300 shadow-xl hover:shadow-pink-500/10 hover:-translate-y-1 select-none"
          >
            <div>
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">📹</div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-pink-400 transition-colors">Video Call</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Experience high-definition video chat with floating local camera overlays and interactive streams.
              </p>
            </div>
            <div className="mt-8 text-xs font-bold text-pink-400 group-hover:text-pink-300 flex items-center gap-1">
              Start video <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
