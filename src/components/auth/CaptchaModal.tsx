import React, { useState, useEffect } from 'react';

interface CaptchaModalProps {
  isOpen: boolean;
  onSuccess: (token: string) => void;
}

export default function CaptchaModal({ isOpen, onSuccess }: CaptchaModalProps) {
  const [sliderVal, setSliderVal] = useState(0);
  const [targetPos, setTargetPos] = useState(70);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState('Drag the slider to match the puzzle piece!');

  // Generate a random target position when the modal opens
  useEffect(() => {
    if (isOpen) {
      setTargetPos(Math.floor(Math.random() * 40) + 40); // Between 40% and 80%
      setSliderVal(10);
      setIsSuccess(false);
      setIsDragging(false);
      setMessage('Drag the slider to match the puzzle piece!');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSuccess) return;
    setSliderVal(Number(e.target.value));
    setIsDragging(true);
  };

  const handleSliderRelease = () => {
    if (isSuccess) return;
    setIsDragging(false);
    
    // Check if within matching margin
    const diff = Math.abs(sliderVal - targetPos);
    if (diff <= 4) {
      setIsSuccess(true);
      setMessage('Verification successful! Resuming matchmaking...');
      setTimeout(() => {
        onSuccess('captcha-token-valid-123');
      }, 1000);
    } else {
      setSliderVal(10);
      setMessage('Mismatch! Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300">
      <div className="bg-white/95 border border-white/20 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden mx-4">
        {/* Glow effect decorative balls */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>

        <h3 className="text-xl font-bold text-gray-800 mb-2">Security Verification</h3>
        <p className="text-sm text-gray-500 mb-6">Please solve this puzzle to verify you are human.</p>

        {/* Puzzle Visual Area */}
        <div className="h-28 bg-gray-100 rounded-xl relative overflow-hidden mb-6 flex items-center justify-center border border-gray-200/50">
          {/* Target Slot */}
          <div
            className="absolute top-8 w-12 h-12 bg-indigo-100 border-2 border-dashed border-indigo-400 rounded-lg flex items-center justify-center"
            style={{ left: `${targetPos}%`, transform: 'translateX(-50%)' }}
          >
            <span className="text-indigo-500 font-bold text-[10px] uppercase tracking-wide">Target</span>
          </div>

          {/* Draggable Puzzle Piece */}
          <div
            className={`absolute top-8 w-12 h-12 rounded-lg shadow-md flex items-center justify-center transition-all ${
              isSuccess ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white'
            }`}
            style={{
              left: `${sliderVal}%`,
              transform: 'translateX(-50%)',
              transition: isDragging ? 'none' : 'all 0.2s ease-out',
            }}
          >
            <span className="font-bold text-sm">{isSuccess ? '✓' : '🔑'}</span>
          </div>
        </div>

        {/* Slider Input */}
        <input
          type="range"
          min="10"
          max="90"
          value={sliderVal}
          onChange={handleSliderChange}
          onMouseUp={handleSliderRelease}
          onTouchEnd={handleSliderRelease}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mb-4"
        />

        {/* Status Message */}
        <p className={`text-sm font-semibold transition-all duration-300 ${isSuccess ? 'text-green-600' : 'text-gray-600'}`}>
          {message}
        </p>
      </div>
    </div>
  );
}
