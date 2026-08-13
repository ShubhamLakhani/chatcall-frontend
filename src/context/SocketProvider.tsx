'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { useDeviceFingerprint } from '~/hooks/useDeviceFingerprint';
import { initSocket } from '~/libs/socket';
import { RootState } from '~/store';
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
  
  // Resolve browser tab device fingerprint info
  const deviceInfo = useSelector((state: RootState) => state.auth.deviceInfo);
  useDeviceFingerprint();

  useEffect(() => {
    if (!deviceInfo) return;

    const s = initSocket();

    // Assign unique deviceId query dynamically to the socket configuration
    s.io.opts.query = {
      deviceId: deviceInfo.visitorId,
    };

    // Force connection to trigger connection handler with query parameters.
    // If already connected, perform a re-handshake (disconnect and reconnect) to submit new query params.
    if (s.connected) {
      console.log('[SOCKET] Re-handshaking with deviceId:', deviceInfo.visitorId);
      s.disconnect().connect();
    } else {
      s.connect();
    }

    console.log('[SOCKET] Initialized connection for device:', deviceInfo.visitorId);
    setSocket(s);

    // Intercept socket emits to cache the last find-match payload
    const originalEmit = s.emit;
    s.emit = function (event: string, ...args: unknown[]) {
      if (event === 'find-match') {
        (s as unknown as Record<string, unknown>).__lastMatchRequest = args[0];
      }
      return originalEmit.call(s, event, ...args);
    };

    const handleCaptchaRequired = () => {
      console.log('[SOCKET] Rate limit hit. CAPTCHA verification required.');
      setShowCaptcha(true);
    };

    const handleCaptchaResponse = (res: { success: boolean; error?: string }) => {
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
    };

    s.on('captcha-required', handleCaptchaRequired);
    s.on('verify-captcha-response', handleCaptchaResponse);

    return () => {
      console.log('[SOCKET] Disconnecting socket on cleanup/refresh...');
      s.disconnect();
      s.off('captcha-required', handleCaptchaRequired);
      s.off('verify-captcha-response', handleCaptchaResponse);
    };
  }, [deviceInfo]);

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
