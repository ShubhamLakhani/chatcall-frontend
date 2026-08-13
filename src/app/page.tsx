'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '~/hooks/useAppSelector';
import { useAppDispatch } from '~/hooks/useAppDispatch';
import { loginSuccess, updateRewards } from '~/store/slices/authSlice';
import { getSocket } from '~/libs/socket';
import { RootState } from '~/store';

export default function HomePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const socketRef = useRef<ReturnType<typeof getSocket>>(getSocket());

  const [isMatching, setIsMatching] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'video-call' | 'voice-call' | 'chat'>('video-call');

  // Matchmaking Filters & Self-Attributes
  const [myGender, setMyGender] = useState<'male' | 'female'>('male');
  const [genderFilter, setGenderFilter] = useState<'male' | 'female' | 'all'>('all');
  const [countryFilter, setCountryFilter] = useState<string>(''); // empty means All Countries

  // Live Camera Stream Preview
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const { user, deviceInfo } = useAppSelector((state: RootState) => state.auth);

  // Initialize camera preview on mount
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.warn('[CAMERA] Failed to load local home preview stream:', err);
      });

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Retrieve token query parameters from Google OAuth redirects
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const token = searchParams.get('token');
      if (token) {
        localStorage.setItem('token', token);
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          dispatch(
            loginSuccess({
              token,
              user: {
                id: payload.id,
                email: payload.email,
                username: payload.email.split('@')[0],
              },
            })
          );
          // Clean token query parameters from browser history
          const url = new URL(window.location.href);
          url.searchParams.delete('token');
          window.history.replaceState({}, '', url.pathname + url.search);
        } catch (e) {
          console.error("Failed to parse Google OAuth token:", e);
        }
      }
    }
  }, [dispatch]);

  // Bind Socket Listeners
  useEffect(() => {
    const socket = socketRef.current;

    socket.on('waiting', () => {
      console.log('Waiting for match...');
      setIsMatching(true);
    });

    socket.on('matched', ({ chatRoomId, initiator, moduleType, icebreaker, partner }) => {
      console.log('Matched with a user:', chatRoomId, initiator, moduleType);
      setIsMatching(false);

      // Clean up camera preview before routing
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

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

    socket.on('insufficient-coins', ({ message }) => {
      alert(message);
      setIsMatching(false);
    });

    socket.on('rewards-updated', (data: { coins: number; streakCount: number }) => {
      dispatch(updateRewards(data));
    });

    return () => {
      socket.off('waiting');
      socket.off('matched');
      socket.off('insufficient-coins');
      socket.off('rewards-updated');
    };
  }, [router, localStream, dispatch]);

  const handleStartMatching = () => {
    if (!socketRef.current) return;
    setIsMatching(true);

    if (deviceInfo) {
      socketRef.current.emit('find-match', {
        deviceId: deviceInfo.visitorId,
        moduleType: selectedMode,
        genderFilter,
        countryFilter,
        userGender: myGender,
        userCountry: 'US', // default local country placeholder
      });
    } else {
      console.error('Device info is not available.');
    }
  };

  const handleCancelSearch = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('leave-room', {}); // cancel queue
    setIsMatching(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white overflow-y-auto">
      
      {/* 🟢 HERO STAGE: Dual Screen Video & Sleek Control Bar */}
      <section className="relative w-full flex flex-col items-center justify-center pt-28 pb-16 px-4 md:px-8 border-b border-white/5 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black">
        
        {/* Floating Top Header Bar */}
        <div className="absolute top-6 left-4 right-4 z-20 max-w-5xl mx-auto flex justify-between items-center bg-zinc-900/60 backdrop-blur-xl border border-white/5 px-6 py-3 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-xs font-bold text-green-400 tracking-wider">
              12,480 ONLINE
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="text-xs font-semibold text-amber-400 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                🪙 {user.coins ?? 100} Coins
              </div>
            )}
            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded uppercase">
              18+ Safety Enforcement
            </span>
          </div>
        </div>

        <div className="max-w-5xl w-full flex flex-col gap-6 mt-6">
          
          {/* Dual 16:9 Video Stage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full aspect-video md:aspect-[2.4/1]">
            
            {/* Left Screen: Partner Stream / Radar Animation */}
            <div className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden relative flex flex-col items-center justify-center shadow-2xl backdrop-blur-md">
              {isMatching ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                  <div className="relative flex h-24 w-24 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500/30 opacity-75"></span>
                    <span className="animate-pulse absolute inline-flex h-3/4 w-3/4 rounded-full bg-indigo-500/20"></span>
                    <div className="relative flex h-12 w-12 rounded-full bg-indigo-600 justify-center items-center text-2xl shadow-lg shadow-indigo-600/50">
                      🛰️
                    </div>
                  </div>
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-indigo-400 mt-4 animate-pulse">
                    Connecting with peer...
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-1">Filters active: {genderFilter === 'all' ? 'Everyone' : genderFilter.toUpperCase()}</p>
                </div>
              ) : (
                <div className="text-center p-6 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-800/80 flex items-center justify-center text-3xl mb-4 border border-white/5">
                    🤝
                  </div>
                  <h3 className="text-lg font-bold text-zinc-300">Ready to Match</h3>
                  <p className="text-zinc-500 text-xs mt-1 max-w-xs">
                    Choose chat preferences below and hit Start to connect instantly with a stranger.
                  </p>
                </div>
              )}
            </div>

            {/* Right Screen: Live Local Webcam Preview */}
            <div className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl">
              {localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 bg-zinc-900">
                  <div className="text-3xl animate-bounce mb-3">📹</div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Initializing Webcam Feed...</p>
                </div>
              )}
              {/* "You" overlay badge */}
              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 text-white/90 text-[10px] font-extrabold px-3 py-1 rounded-full tracking-wider uppercase">
                You
              </div>
            </div>

          </div>

          {/* Integrated Sleek Control Bar */}
          <div className="bg-zinc-900/60 border border-white/5 backdrop-blur-2xl p-4 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-4">
            
            {/* Mode Switcher pills */}
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-full lg:w-auto">
              <button
                onClick={() => setSelectedMode('video-call')}
                disabled={isMatching}
                className={`flex-1 lg:flex-initial px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  selectedMode === 'video-call'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                📹 Video
              </button>
              <button
                onClick={() => setSelectedMode('voice-call')}
                disabled={isMatching}
                className={`flex-1 lg:flex-initial px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  selectedMode === 'voice-call'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                🎙️ Voice
              </button>
              <button
                onClick={() => setSelectedMode('chat')}
                disabled={isMatching}
                className={`flex-1 lg:flex-initial px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  selectedMode === 'chat'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                💬 Text
              </button>
            </div>

            {/* Match Select dropdowns */}
            <div className="grid grid-cols-3 gap-2 w-full lg:w-auto flex-1 max-w-xl">
              <div>
                <select
                  value={myGender}
                  onChange={(e) => setMyGender(e.target.value as 'male' | 'female')}
                  disabled={isMatching}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-[11px] font-bold text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="male">My Gender: Male ♂</option>
                  <option value="female">My Gender: Female ♀</option>
                </select>
              </div>

              <div>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value as 'male' | 'female' | 'all')}
                  disabled={isMatching}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-[11px] font-bold text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">Everyone (Free)</option>
                  <option value="male">Male (Costs 5 🪙)</option>
                  <option value="female">Female (Costs 5 🪙)</option>
                </select>
              </div>

              <div>
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  disabled={isMatching}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-[11px] font-bold text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">All Countries (Free)</option>
                  <option value="US">USA (Costs 5 🪙)</option>
                  <option value="GB">UK (Costs 5 🪙)</option>
                  <option value="CA">Canada (Costs 5 🪙)</option>
                  <option value="DE">Germany (Costs 5 🪙)</option>
                  <option value="IN">India (Costs 5 🪙)</option>
                </select>
              </div>
            </div>

            {/* Glowing Action Button */}
            {isMatching ? (
              <button
                onClick={handleCancelSearch}
                className="w-full lg:w-48 py-3 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                🛑 Cancel Search
              </button>
            ) : (
              <button
                onClick={handleStartMatching}
                className="w-full lg:w-48 py-3 bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-black rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-lg shadow-green-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                ⚡ Start Matching
              </button>
            )}

          </div>

        </div>

      </section>

      {/* 🟠 LANDING CONTENT: Features Grid */}
      <section className="max-w-5xl w-full mx-auto px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Explore Free Random Video Chat on <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">PulseRoom</span>
          </h2>
          <p className="text-zinc-400 text-sm mt-2">
            The premium Omegle alternative. Meet new friends around the world with instant matching, high-definition streams, and active moderation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/5 border border-white/5 p-6 rounded-2xl hover:border-indigo-500/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl mb-4">
              ⚡
            </div>
            <h3 className="font-bold text-zinc-100 text-sm">Sub-10ms Matchmaking</h3>
            <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
              Powered by Redis Sorted Sets and optimized queue structures. No infinite wait loops.
            </p>
          </div>

          <div className="bg-white/5 border border-white/5 p-6 rounded-2xl hover:border-indigo-500/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl mb-4">
              📹
            </div>
            <h3 className="font-bold text-zinc-100 text-sm">HD Video & Audio</h3>
            <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
              Crisp WebRTC peer connection audio and video. Real-time visualizers sync stream volume dynamically.
            </p>
          </div>

          <div className="bg-white/5 border border-white/5 p-6 rounded-2xl hover:border-indigo-500/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl mb-4">
              🧊
            </div>
            <h3 className="font-bold text-zinc-100 text-sm">Interactive Icebreakers</h3>
            <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
              Instant access to 30+ conversation starters matching peer screens with real-time shuffle capabilities.
            </p>
          </div>

          <div className="bg-white/5 border border-white/5 p-6 rounded-2xl hover:border-indigo-500/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl mb-4">
              🛡️
            </div>
            <h3 className="font-bold text-zinc-100 text-sm">Anonymous & Safe</h3>
            <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
              No phone numbers required. Custom shadowbanning, reporting, and slider CAPTCHAs keep bots away.
            </p>
          </div>
        </div>
      </section>

      {/* 🔵 LANDING CONTENT: How It Works & Safety Guidelines */}
      <section className="bg-zinc-900/40 border-y border-white/5 py-16">
        <div className="max-w-5xl w-full mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">How PulseRoom Works</h2>
            <p className="text-zinc-400 text-sm mt-2">Connecting with strangers is simple, clean, and fast.</p>

            <div className="space-y-6 mt-8">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Allow Camera Access</h4>
                  <p className="text-zinc-400 text-xs mt-1">Enable media device permissions to see your local stream inside the stage preview box.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Configure Filtering Preferences</h4>
                  <p className="text-zinc-400 text-xs mt-1">Optionally specify target gender or regional country settings using coins.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Start Instant Matchmaking</h4>
                  <p className="text-zinc-400 text-xs mt-1">Press Start Matching. Our real-time matchmaking queue will connect you instantly.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-rose-500/5 border border-rose-500/10 p-8 rounded-3xl">
            <div className="text-3xl mb-4">🛡️</div>
            <h3 className="text-lg font-bold text-rose-400">Strict Safety Enforcement</h3>
            <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
              We enforce strict compliance policies to protect users against abuse:
            </p>
            <ul className="list-disc pl-4 space-y-2 text-zinc-400 text-xs mt-4">
              <li>18+ Age Requirement validation on join.</li>
              <li>Sliding CAPTCHA rate limits prevent rapid skipping abuse.</li>
              <li>Instantly block and report offensive users during live connections.</li>
              <li>Toxic users are isolated in shadowbanning matchmaking queues.</li>
            </ul>
          </div>

        </div>
      </section>

      {/* 🟣 LANDING CONTENT: Global Stats & Mobile Teaser */}
      <section className="max-w-5xl w-full mx-auto px-6 py-16 flex flex-col lg:flex-row gap-12 items-center justify-between">
        <div className="w-full lg:w-1/2 grid grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/5 p-6 rounded-2xl text-center">
            <div className="text-2xl font-black text-indigo-400">12k+</div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">Online</div>
          </div>
          <div className="bg-white/5 border border-white/5 p-6 rounded-2xl text-center">
            <div className="text-2xl font-black text-indigo-400">100+</div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">Countries</div>
          </div>
          <div className="bg-white/5 border border-white/5 p-6 rounded-2xl text-center">
            <div className="text-2xl font-black text-indigo-400">100k+</div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">Matches</div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 bg-gradient-to-r from-zinc-900 to-black border border-white/5 p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-extrabold text-lg text-zinc-100">Take PulseRoom Anywhere</h3>
            <p className="text-zinc-400 text-xs mt-1 max-w-xs">
              Connect on the go. Mobile-optimized responsive templates run smoothly on mobile Safari and Chrome.
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <div className="bg-zinc-800 border border-white/10 px-4 py-2 rounded-xl text-center cursor-pointer hover:bg-zinc-700 transition-all">
              <span className="text-[10px] block text-zinc-500 font-bold uppercase leading-none">Get it on</span>
              <span className="text-xs font-bold text-zinc-200">Google Play</span>
            </div>
            <div className="bg-zinc-800 border border-white/10 px-4 py-2 rounded-xl text-center cursor-pointer hover:bg-zinc-700 transition-all">
              <span className="text-[10px] block text-zinc-500 font-bold uppercase leading-none">Download on the</span>
              <span className="text-xs font-bold text-zinc-200">App Store</span>
            </div>
          </div>
        </div>
      </section>

      {/* 🔴 LANDING CONTENT: Comprehensive Footer */}
      <footer className="w-full bg-black border-t border-white/5 py-12 px-6">
        <div className="max-w-5xl w-full mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <span className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              PulseRoom
            </span>
            <p className="text-zinc-500 text-[10px] mt-1">Copyright © 2026 PulseRoom Inc. All rights reserved.</p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-[11px] font-bold text-zinc-400">
            <a href="#" className="hover:text-indigo-400 transition-all">Privacy Policy</a>
            <a href="#" className="hover:text-indigo-400 transition-all">Terms of Service</a>
            <a href="#" className="hover:text-indigo-400 transition-all">Rules & Safety</a>
            <a href="#" className="hover:text-indigo-400 transition-all">Contact Us</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
