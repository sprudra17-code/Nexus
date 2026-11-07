import React, { useState } from 'react';
import {
  X,
  Bell,
  Volume2,
  VolumeX,
  Shield,
  Key,
  Trash2,
  LogOut,
  Check,
  Copy,
  Info,
} from 'lucide-react';
import {
  soundSettings,
  playIncomingMessageSound,
} from '../utils/sound';
import {
  notificationSettings,
  requestNotificationPermission,
  sendDesktopNotification,
  getNotificationPermissionStatus,
} from '../utils/notifications';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  myUsername: string;
  myAvatar: string;
  myFingerprint?: string;
  onClearActiveChat: () => void;
  onClearAllChats: () => void;
  onDeleteAccount: () => void;
  activeChatTitle: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  myUsername,
  myAvatar,
  myFingerprint,
  onClearActiveChat,
  onClearAllChats,
  onDeleteAccount,
  activeChatTitle,
}) => {
  const [activeTab, setActiveTab] = useState<'notifications' | 'privacy' | 'data'>('notifications');
  const [soundEnabled, setSoundEnabled] = useState(soundSettings.soundEnabled);
  const [bgOnlySound, setBgOnlySound] = useState(soundSettings.soundOnlyInBackground);
  const [notifsEnabled, setNotifsEnabled] = useState(notificationSettings.notificationsEnabled);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [clearedMessage, setClearedMessage] = useState('');

  if (!isOpen) return null;

  const permStatus = getNotificationPermissionStatus();

  const handleSoundToggle = (val: boolean) => {
    setSoundEnabled(val);
    soundSettings.soundEnabled = val;
  };

  const handleBgSoundToggle = (val: boolean) => {
    setBgOnlySound(val);
    soundSettings.soundOnlyInBackground = val;
  };

  const handleNotifToggle = async (val: boolean) => {
    if (val && permStatus !== 'granted') {
      const res = await requestNotificationPermission();
      if (res === 'granted') {
        setNotifsEnabled(true);
      } else {
        setNotifsEnabled(false);
      }
    } else {
      setNotifsEnabled(val);
      notificationSettings.notificationsEnabled = val;
    }
  };

  const testChime = () => {
    playIncomingMessageSound(true);
  };

  const testNotif = () => {
    sendDesktopNotification(
      'Nexus Notification Test',
      'This is how incoming message alerts look on your screen!',
      { icon: myAvatar }
    );
  };

  const copyFingerprintToClipboard = () => {
    if (myFingerprint) {
      navigator.clipboard.writeText(myFingerprint);
      setCopiedFingerprint(true);
      setTimeout(() => setCopiedFingerprint(false), 2000);
    }
  };

  const triggerClearActive = () => {
    onClearActiveChat();
    setClearedMessage(`Cleared history for ${activeChatTitle}`);
    setTimeout(() => setClearedMessage(''), 3000);
  };

  const triggerClearAll = () => {
    if (confirm('Are you sure you want to clear all message history? This cannot be undone.')) {
      onClearAllChats();
      setClearedMessage('All message history cleared');
      setTimeout(() => setClearedMessage(''), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[88vh] text-slate-900 dark:text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">
              {myAvatar}
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Settings &amp; Privacy</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">@{myUsername}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'notifications'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Bell className="w-4 h-4" />
            Notifications &amp; Sound
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'privacy'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Shield className="w-4 h-4" />
            E2EE Security
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'data'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            Data &amp; Session
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {clearedMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{clearedMessage}</span>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              {/* Notification Toggle */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-500" />
                      Desktop Push Notifications
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      System status: <span className="font-semibold capitalize">{permStatus}</span>
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifsEnabled}
                      onChange={(e) => handleNotifToggle(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={testNotif}
                    disabled={!notifsEnabled || permStatus !== 'granted'}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition"
                  >
                    Send Test Notification
                  </button>
                </div>
              </div>

              {/* Web Audio Synthesizer Sound */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      {soundEnabled ? (
                        <Volume2 className="w-4 h-4 text-blue-500" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-slate-400" />
                      )}
                      Synthesized Message Beep
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Crisp dual-tone chime generated via browser Web Audio API
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={soundEnabled}
                      onChange={(e) => handleSoundToggle(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {soundEnabled && (
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bgOnlySound}
                        onChange={(e) => handleBgSoundToggle(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <span>Only beep when Nexus is in the background</span>
                    </label>
                    <button
                      onClick={testChime}
                      className="px-3 py-1 text-xs font-medium rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition"
                    >
                      Play Sample Chime
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      End-to-End Encryption (E2EE) Identity
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Standard: ECDH Curve P-256 with AES-GCM 256-bit Cipher
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Key className="w-3 h-3 text-slate-400" />
                      Your Cryptographic Safety Number
                    </span>
                    <button
                      onClick={copyFingerprintToClipboard}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {copiedFingerprint ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedFingerprint ? 'Copied' : 'Copy Fingerprint'}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-slate-700 dark:text-slate-300 tracking-wider bg-slate-50 dark:bg-slate-800 p-2.5 rounded border border-slate-200 dark:border-slate-700 select-all">
                    {myFingerprint || 'Initializing cryptographic fingerprint...'}
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Compare this number with your contact&apos;s displayed safety number to verify that direct messages are completely end-to-end encrypted without third-party interception.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Global Lobby vs Personal Contacts:</strong> Messages in the Nexus Global Lounge are public to everyone. Direct contacts use client-side ECDH key agreement where only you and the recipient hold the decryption key.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4">
              {/* Clear active chat */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                    Clear Current Chat
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Purge messages from <strong>{activeChatTitle}</strong>
                  </p>
                </div>
                <button
                  onClick={triggerClearActive}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                >
                  Clear Feed
                </button>
              </div>

              {/* Clear all chats */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                    Clear All Chat History
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Erase all stored messages from global lobby and direct contacts
                  </p>
                </div>
                <button
                  onClick={triggerClearAll}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                >
                  Clear All
                </button>
              </div>

              {/* Delete account and session */}
              <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-red-700 dark:text-red-400 text-sm flex items-center gap-1.5">
                      <LogOut className="w-4 h-4" />
                      Secure Account Deletion &amp; Session Wipe
                    </h4>
                    <p className="text-xs text-red-600/80 dark:text-red-400/80">
                      Revokes encryption keys, removes profile from directory, and logs out
                    </p>
                  </div>
                </div>

                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full py-2 px-3 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition shadow-sm"
                  >
                    Delete Account &amp; Wipe Session
                  </button>
                ) : (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                      Are you sure? This completely purges your local cryptographic keys and socket session.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={onDeleteAccount}
                        className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
                      >
                        Yes, Wipe &amp; Exit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-xs text-slate-500">
          <span>Nexus Chat v2.4 (Open Source)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-medium rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
