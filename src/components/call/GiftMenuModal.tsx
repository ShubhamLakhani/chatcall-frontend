'use client';

import { useState } from 'react';
import { useAppSelector } from '~/hooks/useAppSelector';
import { RootState } from '~/store';

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  cost: number;
}

const GIFTS: GiftItem[] = [
  { id: 'rose', name: 'Rose', emoji: '🌹', cost: 10 },
  { id: 'fire', name: 'Fire', emoji: '🔥', cost: 25 },
  { id: 'crown', name: 'Crown', emoji: '👑', cost: 50 },
  { id: 'rocket', name: 'Rocket', emoji: '🚀', cost: 100 },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSendGift: (giftId: string, giftCost: number, giftEmoji: string, giftName: string) => void;
}

export default function GiftMenuModal({ isOpen, onClose, onSendGift }: Props) {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectGift = (gift: GiftItem) => {
    setErrorMsg(null);
    const balance = user?.coins ?? 0;
    if (balance < gift.cost) {
      setErrorMsg(`Insufficient coins! You need ${gift.cost} 🪙 to send a ${gift.name}.`);
      return;
    }
    onSendGift(gift.id, gift.cost, gift.emoji, gift.name);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Modal Container */}
      <div className="bg-zinc-950/95 border border-white/10 w-full max-w-sm rounded-3xl p-6 relative shadow-2xl backdrop-blur-2xl text-white">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white font-bold w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/5 transition-all"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-4">
          <h3 className="text-base font-extrabold text-indigo-400">🎁 Send a Gift</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Surprise your partner! Balance: <span className="text-amber-400 font-bold">🪙 {user?.coins ?? 0}</span>
          </p>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-3.5 py-2.5 rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        {/* Gift Items Grid */}
        <div className="grid grid-cols-2 gap-3">
          {GIFTS.map((gift) => (
            <button
              key={gift.id}
              onClick={() => handleSelectGift(gift)}
              className="bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 p-4 rounded-2xl flex flex-col items-center justify-center transition-all group cursor-pointer text-center"
            >
              <span className="text-4xl group-hover:scale-110 transition-transform mb-2">
                {gift.emoji}
              </span>
              <span className="font-extrabold text-xs text-zinc-200 group-hover:text-white">
                {gift.name}
              </span>
              <span className="text-[10px] font-black text-amber-400 mt-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/10">
                🪙 {gift.cost}
              </span>
            </button>
          ))}
        </div>

        {/* Footnote */}
        <p className="text-[9px] text-zinc-500 text-center mt-5 uppercase tracking-wider font-extrabold">
          Recipient receives 50% of the gift cost as earnings
        </p>

      </div>
    </div>
  );
}
