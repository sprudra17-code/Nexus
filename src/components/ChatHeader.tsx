import React, { useState } from 'react';
import {
  Menu,
  Lock,
  Globe,
  Phone,
  Video,
  Shield,
  Trash2,
  Check,
  Copy,
  X,
} from 'lucide-react';

interface ChatHeaderProps {
  title: string;
  avatar: string;
  isEncrypted: boolean;
  isOnline: boolean;
  peerFingerprint?: string;
  onOpenMobileMenu: () => void;
  onInitiateCall: (isVideo: boolean) => void;
  onClearChat: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  avatar,
  isEncrypted,
  isOnline,
  peerFingerprint,
  onOpenMobileMenu,
  onInitiateCall,
  onClearChat,
}) => {
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyFingerprint = () => {
    if (peerFingerprint) {
      navigator.clipboard.writeText(peerFingerprint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <header className="h-16 px-4 md:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Sidebar Toggle Button */}
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
            {avatar}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white dark:border-slate-900 rounded-full ${
                isOnline ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            ></span>
          </div>

          <div className="min-w-0">
            <h2 className="font-bold text-sm md:text-base text-slate-900 dark:text-white truncate flex items-center gap-1.5">
              {title}
              {isEncrypted ? (
                <span
                  onClick={() => setShowSafetyModal(true)}
                  className="cursor-pointer text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 hover:bg-emerald-100 transition"
                  title="Click to verify cryptographic safety number"
                >
                  <Lock className="w-2.5 h-2.5" />
                  E2EE
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" />
                  Public
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {isOnline ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
              ) : (
                <span>Active</span>
              )}
              {isEncrypted && ' • Zero-Knowledge Direct Message'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 md:gap-2">
          {isEncrypted && (
            <button
              onClick={() => setShowSafetyModal(true)}
              title="Verify Security Number"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-700"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Safety Number</span>
            </button>
          )}

          <button
            onClick={() => onInitiateCall(false)}
            title="Audio Call"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Phone className="w-4 h-4" />
          </button>

          <button
            onClick={() => onInitiateCall(true)}
            title="Video Stream"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Video className="w-4 h-4" />
          </button>

          <button
            onClick={onClearChat}
            title="Clear this conversation"
            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Safety Number Verification Modal */}
      {showSafetyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-base">Verify Safety Number</h3>
              </div>
              <button
                onClick={() => setShowSafetyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              If you wish to verify that your end-to-end encryption with <strong>{title}</strong> is secure and untampered, compare the safety numbers below with their screen.
            </p>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-center text-xs tracking-widest text-slate-800 dark:text-slate-200 mb-3 select-all">
              {peerFingerprint || 'Peer safety number not generated yet'}
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Lock className="w-3 h-3" />
                AES-GCM-256 Validated
              </span>
              <button
                onClick={copyFingerprint}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Number'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
