'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  widthClass?: string; // e.g. max-w-md, max-w-xl
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  widthClass = 'max-w-md',
}: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={`relative w-full ${widthClass} bg-zinc-900/90 border border-white/10 text-white rounded-3xl shadow-2xl p-6 backdrop-blur-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 text-zinc-400 hover:text-white transition-colors text-xl font-bold"
        >
          &times;
        </button>

        {/* Optional title */}
        {title && (
          <h2 className="text-xl font-extrabold mb-5 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            {title}
          </h2>
        )}

        {/* Modal Content */}
        <div>{children}</div>
      </div>
    </div>,
    document.body
  );
}
