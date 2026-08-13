// components/Header.tsx
'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AuthModal from "~/components/auth/AuthModal";
import { RootState } from "~/store";
import { logout, updateRewards } from '~/store/slices/authSlice';
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
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-indigo-600">Cashual Call</h1>
            <LiveCounter />
          </div>
          <div>
            {user ? (
              <div className="flex items-center gap-3 sm:gap-4">
                <UserBadges />
                
                {/* Notification Bell */}
                <button
                  onClick={() => setIsRequestsModalOpen(true)}
                  className="relative flex h-8 w-8 items-center justify-center bg-gray-50 border border-gray-200 text-gray-600 rounded-full hover:bg-gray-100 transition-all font-bold shadow-sm"
                  title="View Friend Requests"
                >
                  <span className="text-sm">🔔</span>
                  {pendingRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white animate-bounce">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>

                <span className="text-xs sm:text-sm text-gray-700 font-semibold hidden sm:inline">
                  👋 {user.username || user.email}
                </span>
                
                <button
                  onClick={handleLogout}
                  className="text-xs sm:text-sm font-bold text-red-500 hover:text-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => dispatch(openAuthModal("login"))}
                className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
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
