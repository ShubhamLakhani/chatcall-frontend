import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '~/store';

export default function UserBadges() {
  const user = useSelector((state: RootState) => state.auth.user);

  if (!user) return null;

  const coins = user.coins ?? 100;
  const streakCount = user.streakCount ?? 0;

  return (
    <div className="flex items-center gap-2">
      {/* Coins Badge */}
      <div
        className="flex items-center gap-1 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full shadow-sm text-xs font-bold text-amber-700 hover:scale-105 transition-transform"
        title="Coin Balance"
      >
        <span>🪙</span>
        <span>{coins}</span>
      </div>

      {/* Streak Badge */}
      <div
        className="flex items-center gap-1 px-3 py-1 bg-orange-50 border border-orange-200 rounded-full shadow-sm text-xs font-bold text-orange-700 hover:scale-105 transition-transform"
        title="Active Streak"
      >
        <span>🔥</span>
        <span>{streakCount}d</span>
      </div>
    </div>
  );
}
