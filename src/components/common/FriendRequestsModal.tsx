import React from 'react';

interface FriendRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: Array<{ _id: string; username: string }>;
  onAccept: (userId: string) => void;
  onDecline: (userId: string) => void;
}

export default function FriendRequestsModal({
  isOpen,
  onClose,
  requests,
  onAccept,
  onDecline,
}: FriendRequestsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white/95 border border-white/20 p-6 rounded-2xl shadow-2xl max-w-sm w-full relative overflow-hidden mx-4 text-gray-800 animate-fade-in">
        {/* Glow decorative items */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-pink-400/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-lg font-bold text-gray-800">Friend Requests</h3>
          <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full font-semibold">
            {requests.length} pending
          </span>
        </div>
        
        {requests.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No pending friend requests.</p>
        ) : (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {requests.map((req) => (
              <div key={req._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
                <span className="text-sm font-semibold text-gray-700">👤 {req.username}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onAccept(req._id)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onDecline(req._id)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-600 font-bold rounded-xl text-xs transition-all shadow-inner"
        >
          Close
        </button>
      </div>
    </div>
  );
}
