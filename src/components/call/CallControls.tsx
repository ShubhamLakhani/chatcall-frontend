'use client';

interface Props {
  isMuted: boolean;
  onMuteToggle: () => void;
  onEndCall: () => void;
  onSkip?: () => void;
  onAddFriend?: () => void;
  isFriendAdded?: boolean;
  isVideoEnabled?: boolean;
  onVideoToggle?: () => void;
  isChatOpen?: boolean;
  onChatToggle?: () => void;
  unreadCount?: number;
}

export default function CallControls({
  isMuted,
  onMuteToggle,
  onEndCall,
  onSkip,
  onAddFriend,
  isFriendAdded,
  isVideoEnabled = false,
  onVideoToggle,
  isChatOpen = false,
  onChatToggle,
  unreadCount = 0,
}: Props) {
  return (
    <div className="flex justify-center items-center gap-6 mb-12">
      {/* Microphone Toggle */}
      <button
        onClick={onMuteToggle}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center border transition-all ${
          isMuted
            ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
            : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
        }`}
        title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
      >
        <span className="text-xl font-bold">{isMuted ? '🔇' : '🎤'}</span>
      </button>

      {/* Video Camera Toggle */}
      {onVideoToggle && (
        <button
          onClick={onVideoToggle}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center border transition-all ${
            !isVideoEnabled
              ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
              : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
          }`}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          <span className="text-xl font-bold">{isVideoEnabled ? '📹' : '🚫'}</span>
        </button>
      )}

      {/* Chat Toggle */}
      {onChatToggle && (
        <button
          onClick={onChatToggle}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center border transition-all relative ${
            isChatOpen
              ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/30'
              : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
          }`}
          title={isChatOpen ? 'Hide Chat' : 'Show Chat'}
        >
          <span className="text-xl font-bold">💬</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 bg-gradient-to-r from-rose-500 to-purple-600 border border-white/20 rounded-full items-center justify-center text-[9px] font-black text-white shadow-lg animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* End Call / Leave Room */}
      <button
        onClick={onEndCall}
        className="w-16 h-16 bg-gradient-to-r from-rose-500 to-red-600 border border-rose-500/30 text-white rounded-full shadow-lg shadow-red-500/20 hover:from-rose-600 hover:to-red-700 hover:scale-105 active:scale-95 flex items-center justify-center transition-all"
        title="Disconnect"
      >
        <span className="text-2xl font-bold">⏹</span>
      </button>

      {/* Skip Match */}
      {onSkip && (
        <button
          onClick={onSkip}
          className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-600 border border-indigo-500/30 text-white rounded-full shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 hover:scale-105 active:scale-95 flex items-center justify-center transition-all"
          title="Skip to next user (Space or Right Arrow)"
        >
          <span className="text-xl font-bold">⏭</span>
        </button>
      )}

      {/* Add Friend */}
      {onAddFriend && (
        <button
          onClick={onAddFriend}
          disabled={isFriendAdded}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center border transition-all ${
            isFriendAdded
              ? 'bg-pink-500/20 border-pink-500/40 text-pink-300 cursor-not-allowed'
              : 'bg-white/5 border-white/10 text-pink-400 hover:bg-white/10 hover:text-pink-300'
          }`}
          title={isFriendAdded ? 'Friend Request Sent' : 'Add Friend'}
        >
          <span className="text-xl font-bold">{isFriendAdded ? '❤️' : '♡'}</span>
        </button>
      )}
    </div>
  );
}
