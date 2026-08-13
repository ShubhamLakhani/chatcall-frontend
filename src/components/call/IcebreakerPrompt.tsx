import React, { useEffect, useState } from 'react';

interface IcebreakerPromptProps {
  prompt: string;
  onShuffle?: () => void;
}

export default function IcebreakerPrompt({ prompt, onShuffle }: IcebreakerPromptProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (prompt) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 30000); // Auto-dismiss after 30 seconds

      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [prompt]);

  if (!visible || !prompt) return null;

  return (
    <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-sm px-4 animate-fade-in-down">
      <div className="bg-zinc-900/95 border border-white/10 text-white rounded-2xl py-3.5 px-4.5 shadow-2xl backdrop-blur-xl relative flex items-center justify-between">
        <div className="flex items-center gap-3 pr-2">
          <span className="text-xl select-none">🧊</span>
          <div className="text-left">
            <h4 className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Conversation Icebreaker</h4>
            <p className="text-xs font-semibold leading-relaxed mt-0.5 text-zinc-100">{prompt}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onShuffle && (
            <button
              onClick={onShuffle}
              className="text-indigo-400 hover:text-indigo-300 transition-all text-xs font-bold px-2 py-1 rounded-lg hover:bg-white/5"
              title="Shuffle question"
            >
              Shuffle 🎲
            </button>
          )}
          <button
            onClick={() => setVisible(false)}
            className="text-zinc-400 hover:text-white transition-all text-xs font-bold px-2 py-1 rounded-lg hover:bg-white/5"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
