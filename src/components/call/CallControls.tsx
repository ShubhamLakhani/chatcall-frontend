'use client';

interface Props {
  isMuted: boolean;
  onMuteToggle: () => void;
  onEndCall: () => void;
  onSkip?: () => void;
}

export default function CallControls({ isMuted, onMuteToggle, onEndCall, onSkip }: Props) {
  return (
    <div className="flex justify-center gap-8 mb-20">
      <button
        onClick={onMuteToggle}
        className="w-16 h-16 bg-white rounded-full shadow flex items-center justify-center border border-gray-300 hover:bg-gray-100"
      >
        {isMuted ? (
          <span className="text-red-500 font-bold text-lg">🔇</span>
        ) : (
          <span className="text-green-600 font-bold text-lg">🎤</span>
        )}
      </button>

      <button
        onClick={onEndCall}
        className="w-16 h-16 bg-red-600 text-white rounded-full shadow hover:bg-red-700 flex items-center justify-center"
      >
        <span className="text-xl font-bold">⏹</span>
      </button>

      {onSkip && (
        <button
          onClick={onSkip}
          className="w-16 h-16 bg-indigo-600 text-white rounded-full shadow hover:bg-indigo-700 flex items-center justify-center"
          title="Skip to next user (Space or Right Arrow)"
        >
          <span className="text-xl font-bold">⏭</span>
        </button>
      )}
    </div>
  );
}
