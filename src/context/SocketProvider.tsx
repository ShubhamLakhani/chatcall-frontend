'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useDeviceFingerprint } from '~/hooks/useDeviceFingerprint';
import { initSocket } from '~/libs/socket';

type SocketContextType = {
  socket: Socket | null;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  useDeviceFingerprint();

  useEffect(() => {
    const s = initSocket();
    console.log('Socket initialized:', s.id);
    setSocket(s);

    // return () => {
    // //   s.disconnect(); // optional: disconnect on unmount (for hard refresh cases)
    // };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
