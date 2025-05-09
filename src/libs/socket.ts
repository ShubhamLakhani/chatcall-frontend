// lib/socket.ts
import { io, Socket } from 'socket.io-client';

declare global {
  var _socket: Socket | undefined;
}

const backendUrl = 'https://marijuana-restrictions-directions-sam.trycloudflare.com'; // Replace this with your actual backend

let socket: Socket;

if (!global._socket) {
  global._socket = io(backendUrl, {
    transports: ['websocket'],
    withCredentials: true,
  });

  global._socket.on('connect', () => {
    console.log('[SOCKET] Connected:', global._socket?.id);
  });

  global._socket.on('disconnect', () => {
    console.log('[SOCKET] Disconnected');
  });
}

socket = global._socket;

export const getSocket = () => socket;
