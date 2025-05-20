// components/Header.tsx
'use client';

import { useDispatch, useSelector } from 'react-redux';
import AuthModal from "~/components/auth/AuthModal";
import { RootState } from "~/store";
import { logout } from '~/store/slices/authSlice';
import { openAuthModal } from "~/store/slices/modalSlice";

export default function Header() {
  const dispatch = useDispatch();
  const { isAuthModalOpen } = useSelector((state: RootState) => state.modal);
  const user = useSelector((state: RootState) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    // Optional: clear token from localStorage or cookies here
  };

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-indigo-600">Cashual Call</h1>
          <div>
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-700">
                  👋 {user.username || user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-red-500 hover:underline"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => dispatch(openAuthModal('login'))}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Login / Signup
              </button>
            )}
          </div>
        </div>
      </header>

      {isAuthModalOpen && (
        <AuthModal />
      )}
    </>
  );
}
