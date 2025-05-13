import { useEffect, useState, useRef } from 'react';
import { getSocket } from '~/libs/socket';

export function useTypingIndicator(chatRoomId: string, userId: string) {
  const socket = getSocket();
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const emitTyping = () => {
    socket.emit('typing', { chatRoomId });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', { chatRoomId });
    }, 2000); // user stops typing after 2 seconds of inactivity
  };

  useEffect(() => {
    const handleTyping = ({ from }: { from: string }) => {
      if (from !== userId) setTypingUserId(from);
    };

    const handleStopTyping = () => {
      setTypingUserId(null);
    };

    socket.on('typing', handleTyping);
    socket.on('stop-typing', handleStopTyping);

    return () => {
      socket.off('typing', handleTyping);
      socket.off('stop-typing', handleStopTyping);
    };
  }, [chatRoomId, userId]);

  return { typingUserId, emitTyping };
}
