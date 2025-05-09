// lib/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (): Socket => {
  if (!socket) {
    socket = io('https://chatcall-backend.onrender.com', {
      transports: ['websocket'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[SOCKET] Connected:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('[SOCKET] Disconnected');
    });
  }

  return socket;
};

export const getSocket = (): Socket => {
  if (!socket) return initSocket();
  return socket;
};