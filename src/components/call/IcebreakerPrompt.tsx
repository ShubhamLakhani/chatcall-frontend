import React, { useEffect, useState } from 'react';

interface IcebreakerPromptProps {
  prompt: string;
}

export default function IcebreakerPrompt({ prompt }: IcebreakerPromptProps) {
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
      <div className="bg-indigo-600/90 border border-indigo-400 text-white rounded-2xl py-3 px-4 shadow-lg backdrop-blur-md relative flex items-center justify-between">
        <div className="flex items-center gap-3 pr-2">
          <span className="text-xl select-none">🧊</span>
          <div className="text-left">
            <h4 className="text-[9px] uppercase font-bold text-indigo-200 tracking-wider">Conversation Icebreaker</h4>
            <p className="text-xs font-semibold leading-relaxed mt-0.5">{prompt}</p>
          </div>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-indigo-200 hover:text-white transition-all text-xs font-bold px-2 py-1 rounded-lg hover:bg-white/10 shrink-0"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
