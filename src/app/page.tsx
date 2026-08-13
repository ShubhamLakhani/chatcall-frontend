'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '~/hooks/useAppSelector';
import { getSocket } from '~/libs/socket';
import { RootState } from '~/store';
// import { cookies, headers } from 'next/headers';
// import UAParser from 'ua-parser-js';

export default function HomePage() {
  const router = useRouter();
  const socketRef = useRef<ReturnType<typeof getSocket>>(getSocket());
  const [isMatching, setIsMatching] = useState(false);
  const [matchType, setMatchType] = useState<'voice-call' | 'chat' | null>(null);
  const deviceInfo = useAppSelector((state: RootState) => state.auth.deviceInfo);

  console.log('Device Info:', deviceInfo);

  // const ip = cookies().get('client-ip')?.value || 'Unknown';
  // const uaString = cookies().get('user-agent')?.value || '';
  // const parser = new UAParser(uaString);
  // const ua = parser.getResult();

  // const deviceInfo = {
  //   ip,
  //   os: ua.os.name,
  //   browser: ua.browser.name,
  //   deviceType: ua.device.type || 'desktop',
  // };

  useEffect(() => {
    const socket = socketRef.current;

    // console.log({socket})

    if(socket.connected)  {
      console.log('Socket is conneted. :', socket.id)
    }

    socket.on('waiting', () => {
      console.log('Waiting for match...');
      setIsMatching(true);
    });

    socket.on('matched', ({ chatRoomId, initiator, moduleType, icebreaker, partner }) => {
      console.log('Matched with a user:', chatRoomId, initiator, moduleType);
      const partnerId = partner?._id || '';
      const partnerName = partner?.username || '';
      const encodedIcebreaker = encodeURIComponent(icebreaker || '');
      const encodedPartnerName = encodeURIComponent(partnerName);

      if (moduleType === 'chat') {
        router.push(`/chat?room=${chatRoomId}&initiator=${initiator}&partnerId=${partnerId}&partnerName=${encodedPartnerName}&icebreaker=${encodedIcebreaker}`);
      } else {
        router.push(`/call?room=${chatRoomId}&initiator=${initiator}&partnerId=${partnerId}&partnerName=${encodedPartnerName}&icebreaker=${encodedIcebreaker}`);
      }
    });

    // return () => {
    //   // Do not disconnect here — we persist the socket
    //   socket.off('waiting');
    //   socket.off('matched');
    // };
  }, [router, matchType]);

  const handleStartVoiceCall = () => {
    if (!socketRef.current) return;
    setIsMatching(true);
    setMatchType('voice-call');
    if (deviceInfo) {
      socketRef.current.emit('find-match', { deviceId: `dev-${Math.random().toString(36).substring(2, 10)}`, moduleType: 'voice-call' });
    } else {
      console.error('Device info is not available.');
    }
  };

  const handleStartTextChat = () => {
    if (!socketRef.current) return;
    setIsMatching(true);
    setMatchType('chat');
    if (deviceInfo) {
      socketRef.current.emit('find-match', { deviceId: `dev-${Math.random().toString(36).substring(2, 10)}`, moduleType: 'chat' });
    } else {
      console.error('Device info is not available.');
    }
  };
  

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-10 bg-gradient-to-br from-blue-50 to-indigo-100">
      <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">Cashual Call</h1>
      <p className="text-gray-600 text-center mb-10 max-w-md">
        Connect instantly with real people via voice or text. Earn rewards just by chatting.
      </p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded text-lg font-semibold"
          onClick={handleStartVoiceCall}
          disabled={isMatching}
        >
          {isMatching ? 'Looking for a match...' : 'Start Voice Call'}
        </button>

        <button
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-6 rounded text-lg font-semibold"
          onClick={handleStartTextChat}
        >
          Start Text Chat
        </button>
      </div>

      {isMatching && (
        <p className="text-sm text-gray-500 mt-4 text-center">Searching for someone to connect...</p>
      )}
    </div>
  );
}
