import { useState, useEffect, useRef } from 'react';
import { Shield, X, Lock, Eye, EyeOff } from 'lucide-react';
import { useToastStore } from '@/store/useToastStore';

interface PinVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  title?: string;
  description?: string;
}

// Default admin PIN - in production, this should be stored securely per user
const getAdminPin = () => {
  return localStorage.getItem('stocktrack_admin_pin') || '1234'; // Default PIN
};

const setAdminPin = (pin: string) => {
  localStorage.setItem('stocktrack_admin_pin', pin);
};

export const PinVerification = ({
  isOpen,
  onClose,
  onVerified,
  title = 'Admin Verification Required',
  description = 'Enter your admin PIN to continue with this operation.'
}: PinVerificationProps) => {
  const { addToast } = useToastStore();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (isOpen) {
      setPin('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (locked && lockTimer > 0) {
      const timer = setTimeout(() => setLockTimer(lockTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (locked && lockTimer === 0) {
      setLocked(false);
      setAttempts(0);
    }
  }, [locked, lockTimer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (locked) return;

    const adminPin = getAdminPin();
    
    if (pin === adminPin) {
      addToast('Access granted', 'success');
      setPin('');
      setAttempts(0);
      onVerified();
      onClose();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');
      
      if (newAttempts >= 3) {
        setLocked(true);
        setLockTimer(30); // 30 second lockout
        addToast('Too many attempts. Locked for 30 seconds.', 'error');
      } else {
        addToast(`Incorrect PIN. ${3 - newAttempts} attempts remaining.`, 'error');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <Shield className="text-amber-600 dark:text-amber-400" size={24} />
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{description}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
              Admin PIN
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                ref={inputRef}
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter PIN"
                disabled={locked}
                className="w-full pl-10 pr-12 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-amber-500 outline-none font-mono text-lg tracking-widest text-center text-slate-800 dark:text-white disabled:opacity-50"
                maxLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {locked && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-center">
              <p className="text-rose-600 dark:text-rose-400 text-sm font-medium">
                Locked for {lockTimer} seconds
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={pin.length < 4 || locked}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Verify Access
          </button>

          <p className="text-xs text-slate-400 text-center">
            Default PIN: 1234 • Change in Settings
          </p>
        </form>
      </div>
    </div>
  );
};

// Change PIN Component
export const ChangePinModal = ({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { addToast } = useToastStore();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const adminPin = getAdminPin();
    
    if (currentPin !== adminPin) {
      addToast('Current PIN is incorrect', 'error');
      return;
    }
    
    if (newPin.length < 4) {
      addToast('PIN must be at least 4 digits', 'error');
      return;
    }
    
    if (newPin !== confirmPin) {
      addToast('PINs do not match', 'error');
      return;
    }
    
    setAdminPin(newPin);
    addToast('Admin PIN changed successfully', 'success');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Change Admin PIN</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Current PIN</label>
            <input
              type="password"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl font-mono text-center"
              maxLength={6}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">New PIN</label>
            <input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl font-mono text-center"
              maxLength={6}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Confirm New PIN</label>
            <input
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl font-mono text-center"
              maxLength={6}
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
          >
            Update PIN
          </button>
        </form>
      </div>
    </div>
  );
};
