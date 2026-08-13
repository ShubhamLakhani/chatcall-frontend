'use client';

import { useState } from 'react';
import { useAppSelector } from '~/hooks/useAppSelector';
import { useAppDispatch } from '~/hooks/useAppDispatch';
import { updateUser } from '~/store/slices/authSlice';
import { RootState } from '~/store';
import axios from 'axios';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CoinStoreModal({ isOpen, onClose }: Props) {
  const dispatch = useAppDispatch();
  const { user, token } = useAppSelector((state: RootState) => state.auth);

  const [activeTab, setActiveTab] = useState<'coins' | 'vip'>('coins');
  const [loading, setLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePurchaseCoins = async (packageId: string) => {
    if (!token) {
      setErrorMsg('You must be logged in to buy coins.');
      return;
    }
    setLoading(packageId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const resp = await axios.post(
        'http://localhost:3001/api/user/purchase-coins',
        { packageId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (resp.data.success) {
        dispatch(
          updateUser({
            coins: resp.data.data.coins,
            isVip: resp.data.data.isVip,
            vipExpiresAt: resp.data.data.vipExpiresAt,
          })
        );
        setSuccessMsg(resp.data.message || 'Coins purchased successfully!');
      }
    } catch (err) {
      console.error('Purchase coins error:', err);
      let msg = 'Coin purchase failed.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.message || msg;
      }
      setErrorMsg(msg);
    } finally {
      setLoading(null);
    }
  };

  const handleActivateVip = async () => {
    if (!token) {
      setErrorMsg('You must be logged in to subscribe to VIP.');
      return;
    }
    setLoading('vip');
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const resp = await axios.post(
        'http://localhost:3001/api/user/subscribe-vip',
        { durationDays: 30 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (resp.data.success) {
        dispatch(
          updateUser({
            coins: resp.data.data.coins,
            isVip: resp.data.data.isVip,
            vipExpiresAt: resp.data.data.vipExpiresAt,
          })
        );
        setSuccessMsg(resp.data.message || 'VIP Status activated!');
      }
    } catch (err) {
      console.error('Activate VIP error:', err);
      let msg = 'VIP subscription failed.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.message || msg;
      }
      setErrorMsg(msg);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Modal Card container */}
      <div className="bg-zinc-950/95 border border-white/10 w-full max-w-md rounded-3xl p-6 relative shadow-2xl backdrop-blur-2xl text-white">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white font-bold w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/5 transition-all"
        >
          ✕
        </button>

        {/* Modal Title & Stats Header */}
        <div className="mb-6">
          <h2 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-yellow-500">
            PulseRoom Store
          </h2>
          <div className="flex items-center justify-between mt-3 bg-white/5 border border-white/5 px-4 py-3 rounded-2xl">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-extrabold">My Balance</span>
              <div className="text-lg font-black text-amber-400">🪙 {user?.coins ?? 0} Coins</div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-extrabold block text-right">VIP Status</span>
              {user?.isVip ? (
                <span className="bg-purple-500/10 border border-purple-500/30 text-purple-400 font-extrabold text-[9px] px-2.5 py-1 rounded-md uppercase tracking-wider block mt-0.5">
                  👑 VIP Active
                </span>
              ) : (
                <span className="bg-zinc-800 border border-white/5 text-zinc-400 font-extrabold text-[9px] px-2.5 py-1 rounded-md uppercase tracking-wider block mt-0.5">
                  Standard Member
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tab switch navigation */}
        <div className="flex bg-black/40 border border-white/5 p-1 rounded-xl mb-6">
          <button
            onClick={() => {
              setActiveTab('coins');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'coins' ? 'bg-white/5 border border-white/10 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            🪙 Buy Coins
          </button>
          <button
            onClick={() => {
              setActiveTab('vip');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'vip' ? 'bg-white/5 border border-white/10 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            👑 Get VIP
          </button>
        </div>

        {/* Dynamic feedback banners */}
        {successMsg && (
          <div className="mb-4 bg-green-500/10 border border-green-500/20 text-green-400 text-xs px-3.5 py-2.5 rounded-xl text-center">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-3.5 py-2.5 rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        {/* Tab content 1: Coins Packages */}
        {activeTab === 'coins' && (
          <div className="space-y-3">
            
            {/* Package 100 */}
            <div className="bg-white/5 border border-white/5 hover:border-white/10 p-4 rounded-2xl flex items-center justify-between transition-all">
              <div>
                <h4 className="font-extrabold text-sm text-zinc-100">🪙 100 Coins</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">Filter up to 20 matched calls</p>
              </div>
              <button
                onClick={() => handlePurchaseCoins('pkg_100')}
                disabled={loading !== null}
                className="bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-bold text-zinc-200 hover:text-white transition-all disabled:opacity-50"
              >
                {loading === 'pkg_100' ? 'Processing...' : '$0.99'}
              </button>
            </div>

            {/* Package 500 */}
            <div className="bg-white/5 border border-amber-500/20 p-4 rounded-2xl flex items-center justify-between relative overflow-hidden">
              <span className="absolute top-0 right-0 bg-amber-500 text-black text-[8px] font-black uppercase px-2 py-0.5 rounded-bl-lg tracking-wider">
                Popular
              </span>
              <div>
                <h4 className="font-extrabold text-sm text-amber-400">🪙 500 Coins</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">Filter up to 100 matched calls</p>
              </div>
              <button
                onClick={() => handlePurchaseCoins('pkg_500')}
                disabled={loading !== null}
                className="bg-amber-500 text-black px-4 py-2 rounded-xl text-xs font-extrabold hover:bg-amber-400 transition-all disabled:opacity-50 shadow shadow-amber-500/10"
              >
                {loading === 'pkg_500' ? 'Processing...' : '$3.99'}
              </button>
            </div>

            {/* Package 1200 */}
            <div className="bg-white/5 border border-purple-500/20 p-4 rounded-2xl flex items-center justify-between relative overflow-hidden">
              <span className="absolute top-0 right-0 bg-purple-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-bl-lg tracking-wider">
                Best Value
              </span>
              <div>
                <h4 className="font-extrabold text-sm text-purple-400">🪙 1,200 Coins</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">+20% Bonus Coins included</p>
              </div>
              <button
                onClick={() => handlePurchaseCoins('pkg_1200')}
                disabled={loading !== null}
                className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-extrabold hover:bg-purple-500 transition-all disabled:opacity-50"
              >
                {loading === 'pkg_1200' ? 'Processing...' : '$7.99'}
              </button>
            </div>

          </div>
        )}

        {/* Tab content 2: VIP Membership */}
        {activeTab === 'vip' && (
          <div className="flex flex-col">
            <div className="bg-purple-950/20 border border-purple-500/10 p-5 rounded-2xl mb-6">
              <h3 className="font-black text-sm text-purple-300 uppercase tracking-wider mb-3">👑 VIP Benefits</h3>
              <ul className="space-y-2 text-xs text-zinc-400">
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">✨</span> Unlimited Free Gender & Country Search Filters
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">👑</span> Golden Nameplate & VIP Profile Badge
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">⚡</span> Priority Queue Matchmaking Routing
                </li>
              </ul>
            </div>

            {user?.isVip ? (
              <div className="text-center py-4">
                <p className="text-xs text-purple-400 font-bold uppercase tracking-wider">👑 VIP active</p>
                {user.vipExpiresAt && (
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Expires on: {new Date(user.vipExpiresAt).toLocaleDateString()}
                  </p>
                )}
                <button
                  onClick={handleActivateVip}
                  disabled={loading !== null}
                  className="w-full mt-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 border border-purple-500/20 text-white rounded-2xl text-xs font-bold uppercase hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading === 'vip' ? 'Activating...' : 'Extend 30 Days (200 🪙)'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleActivateVip}
                disabled={loading !== null}
                className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-indigo-600 border border-purple-500/20 text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2"
              >
                {loading === 'vip' ? 'Activating...' : 'Activate 30 Days (200 🪙)'}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
