// components/Header.tsx
'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AuthModal from "~/components/auth/AuthModal";
import { RootState } from "~/store";
import { loginSuccess, logout, updateRewards } from '~/store/slices/authSlice';
import { openAuthModal } from "~/store/slices/modalSlice";
import LiveCounter from "~/components/common/LiveCounter";
import UserBadges from "~/components/common/UserBadges";
import FriendRequestsModal from "~/components/common/FriendRequestsModal";
import { getSocket } from '~/libs/socket';

export default function Header() {
  const dispatch = useDispatch();
  const { isAuthModalOpen } = useSelector((state: RootState) => state.modal);
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<Array<{ _id: string; username: string }>>([]);

  // Restore authentication session from localStorage token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
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
      } catch (e) {
        console.error("Failed to restore session token:", e);
        localStorage.removeItem('token');
      }
    }
  }, [user, dispatch]);

  // Socket listeners for friend requests and rewards updates
  useEffect(() => {
    if (!user) {
      setPendingRequests([]);
      return;
    }

    const socket = getSocket();

    const handleReqReceived = (data: { fromUser: { _id: string; username: string } }) => {
      console.log('[FRIEND] Friend request received:', data.fromUser);
      setPendingRequests((prev) => {
        if (prev.some((r) => r._id === data.fromUser._id)) return prev;
        return [...prev, data.fromUser];
      });
    };

    const handleReqAccepted = (data: { friend: { _id: string; username: string } }) => {
      console.log('[FRIEND] Friend request accepted by:', data.friend);
      alert(`${data.friend.username} accepted your friend request! ❤️`);
    };

    const handleRewardsUpdated = (data: { coins: number; streakCount: number }) => {
      console.log('[REWARDS] Rewards updated in socket:', data);
      dispatch(updateRewards(data));
    };

    socket.on('friend-request-received', handleReqReceived);
    socket.on('friend-request-accepted', handleReqAccepted);
    socket.on('rewards-updated', handleRewardsUpdated);

    return () => {
      socket.off('friend-request-received', handleReqReceived);
      socket.off('friend-request-accepted', handleReqAccepted);
      socket.off('rewards-updated', handleRewardsUpdated);
    };
  }, [user, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleAcceptRequest = (targetUserId: string) => {
    const socket = getSocket();
    socket.emit('accept-friend-request', { targetUserId });
    setPendingRequests((prev) => prev.filter((r) => r._id !== targetUserId));
  };

  const handleDeclineRequest = (targetUserId: string) => {
    const socket = getSocket();
    socket.emit('decline-friend-request', { targetUserId });
    setPendingRequests((prev) => prev.filter((r) => r._id !== targetUserId));
  };

  return (
    <>
      <header className="bg-zinc-950/40 backdrop-blur-md border-b border-white/10 sticky top-0 z-50 text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              Cashual Call
            </h1>
            <LiveCounter />
          </div>
          <div>
            {user ? (
              <div className="flex items-center gap-3 sm:gap-4">
                <UserBadges />
                
                {/* Notification Bell */}
                <button
                  onClick={() => setIsRequestsModalOpen(true)}
                  className="relative flex h-8 w-8 items-center justify-center bg-white/5 border border-white/10 text-white rounded-full hover:bg-white/10 transition-all font-bold shadow-sm"
                  title="View Friend Requests"
                >
                  <span className="text-sm">🔔</span>
                  {pendingRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white animate-bounce">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>

                <span className="text-xs sm:text-sm text-zinc-300 font-semibold hidden sm:inline">
                  👋 {user.username || user.email}
                </span>
                
                <button
                  onClick={handleLogout}
                  className="text-xs sm:text-sm font-bold text-rose-400 hover:text-rose-300 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => dispatch(openAuthModal("login"))}
                className="text-xs sm:text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Login / Signup
              </button>
            )}
          </div>
        </div>
      </header>

      {isAuthModalOpen && <AuthModal />}
      
      <FriendRequestsModal
        isOpen={isRequestsModalOpen}
        onClose={() => setIsRequestsModalOpen(false)}
        requests={pendingRequests}
        onAccept={handleAcceptRequest}
        onDecline={handleDeclineRequest}
      />
    </>
  );
}
