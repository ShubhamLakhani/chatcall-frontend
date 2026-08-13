'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useDeviceFingerprint } from '~/hooks/useDeviceFingerprint';
import { initSocket } from '~/libs/socket';
import CaptchaModal from '~/components/auth/CaptchaModal';

type SocketContextType = {
  socket: Socket | null;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  useDeviceFingerprint();

  useEffect(() => {
    const s = initSocket();
    console.log('Socket initialized:', s.id);
    setSocket(s);

    // Intercept socket emits to cache the last find-match payload
    const originalEmit = s.emit;
    s.emit = function (event: string, ...args: unknown[]) {
      if (event === 'find-match') {
        (s as unknown as Record<string, unknown>).__lastMatchRequest = args[0];
      }
      return originalEmit.call(s, event, ...args);
    };

    s.on('captcha-required', () => {
      console.log('[SOCKET] Rate limit hit. CAPTCHA verification required.');
      setShowCaptcha(true);
    });

    s.on('verify-captcha-response', (res: { success: boolean; error?: string }) => {
      if (res.success) {
        console.log('[SOCKET] CAPTCHA successfully verified. Dismissing modal.');
        setShowCaptcha(false);
        // Automatically re-trigger the matchmaking search
        const lastRequest = (s as unknown as Record<string, unknown>).__lastMatchRequest;
        if (lastRequest) {
          console.log('[SOCKET] Re-triggering search with:', lastRequest);
          s.emit('find-match', lastRequest);
        }
      } else {
        console.error('[SOCKET] CAPTCHA verification failed:', res.error);
      }
    });

    return () => {
      s.off('captcha-required');
      s.off('verify-captcha-response');
    };
  }, []);

  const handleCaptchaSolved = (token: string) => {
    if (socket) {
      console.log('[SOCKET] Sending captcha verification token...');
      socket.emit('verify-captcha', { token });
    }
  };

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
      <CaptchaModal isOpen={showCaptcha} onSuccess={handleCaptchaSolved} />
    </SocketContext.Provider>
  );
};
