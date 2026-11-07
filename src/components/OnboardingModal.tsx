import React, { useState } from 'react';
import { ShieldCheck, Bell, Sparkles, Lock } from 'lucide-react';
import { requestNotificationPermission, getNotificationPermissionStatus } from '../utils/notifications';

interface OnboardingModalProps {
  onComplete: (username: string, avatar: string, allowNotifications: boolean) => void;
}

const AVATAR_OPTIONS = ['🚀', '⚡', '🤖', '🔮', '👾', '🔥', '💎', '🦊', '🦉', '🌿', '🌊', '🛡️'];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🚀');
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentPermission = getNotificationPermissionStatus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    if (!cleanUser) {
      setError('Please enter a username or alias.');
      return;
    }
    if (cleanUser.length < 2) {
      setError('Username must be at least 2 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUser)) {
      setError('Letters, numbers, underscores, and dashes only.');
      return;
    }

    setIsSubmitting(true);

    // Request notification permission during login if requested
    if (enableNotifications && currentPermission !== 'unsupported') {
      try {
        await requestNotificationPermission();
      } catch (err) {
        console.warn('Notification permission error:', err);
      }
    }

    onComplete(cleanUser, selectedAvatar, enableNotifications);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 text-slate-900 dark:text-slate-100 transition-all">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            N
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Welcome to Nexus
              <Sparkles className="w-4 h-4 text-blue-500" />
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Open-source real-time chat &amp; encrypted messaging
            </p>
          </div>
        </div>

        {/* Security badge notice */}
        <div className="mt-4 mb-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
          <Lock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>
            <strong>Zero-Knowledge Encryption:</strong> A dedicated Web Crypto 256-bit key pair will be generated locally in your browser.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Choose your Alias / Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="e.g. Alex, Sam, TechExplorer"
              autoFocus
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Select Avatar
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedAvatar(emoji)}
                  className={`h-11 rounded-xl text-xl flex items-center justify-center transition border ${
                    selectedAvatar === emoji
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow-sm scale-105'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* One-time notification permission prompt */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableNotifications}
                onChange={(e) => setEnableNotifications(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-blue-500" />
                  Allow Message Notifications
                </span>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Get notified when people send messages while Nexus is minimized or running in the background.
                </p>
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {isSubmitting ? 'Generating Cryptographic Keys...' : 'Enter Nexus Lounge'}
          </button>
        </form>
      </div>
    </div>
  );
};
