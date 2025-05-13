import { useEffect } from 'react';
import { getSocket } from '~/libs/socket';

export function useSeenTracking(chatRoomId: string, receiverId: string, onSeen?: () => void) {
  const socket = getSocket();

  useEffect(() => {
    // Send seen event when entering the room
    socket.emit('mark-read', { chatRoomId, receiverId });

    // Listen for confirmation from server
    socket.on('messages-read', ({ by }: { by: string }) => {
      if (by !== receiverId && onSeen) onSeen();
    });

    return () => {
      socket.off('messages-read');
    };
  }, [chatRoomId, receiverId]);
}
