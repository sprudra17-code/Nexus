import React, { useState } from 'react';
import {
  Globe,
  Lock,
  UserPlus,
  Settings,
  Code2,
  Search,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { ContactInfo } from '../types/chat';

interface SidebarProps {
  myUsername: string;
  myAvatar: string;
  activeChatId: string;
  onSelectChat: (targetId: string, title: string, avatar: string, isEncrypted: boolean) => void;
  contacts: ContactInfo[];
  registeredDirectory: ContactInfo[];
  onAddContact: (username: string) => void;
  onOpenSettings: () => void;
  onOpenOpenSource: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  myUsername,
  myAvatar,
  activeChatId,
  onSelectChat,
  contacts,
  registeredDirectory,
  onAddContact,
  onOpenSettings,
  onOpenOpenSource,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'directory'>('chats');
  const [addUserInput, setAddUserInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState('');

  // Format message timestamps cleanly
  const formatSidebarTimestamp = (timestamp?: number): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (isYesterday) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = addUserInput.trim();
    if (!target) return;
    if (target.toLowerCase() === myUsername.toLowerCase()) {
      setAddError("You can't add yourself as a personal contact.");
      return;
    }
    onAddContact(target);
    setAddUserInput('');
    setShowAddModal(false);
    setAddError('');
  };

  const filteredContacts = contacts.filter((c) =>
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDirectory = registeredDirectory.filter(
    (u) =>
      u.username.toLowerCase() !== myUsername.toLowerCase() &&
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      className={`fixed md:static inset-y-0 left-0 z-40 w-80 md:w-84 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      {/* Brand & Action Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            N
          </div>
          <div>
            <h1 className="font-bold text-base leading-none text-slate-900 dark:text-white">
              Nexus
            </h1>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              E2EE Real-Time Chat
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAddModal(true)}
            title="Add contact by username"
            className="p-2 rounded-lg text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <UserPlus className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            title="Settings & Privacy"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats or username..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Tabs: Active Chats / Discover Directory */}
      <div className="px-3 py-1 flex gap-2 border-b border-slate-100 dark:border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-1.5 font-medium rounded-lg transition text-center ${
            activeTab === 'chats'
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Conversations ({contacts.length + 1})
        </button>
        <button
          onClick={() => setActiveTab('directory')}
          className={`flex-1 py-1.5 font-medium rounded-lg transition text-center flex items-center justify-center gap-1 ${
            activeTab === 'directory'
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Users className="w-3 h-3" />
          Directory ({registeredDirectory.length})
        </button>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {activeTab === 'chats' ? (
          <>
            {/* Global Community Lounge (Always at top) */}
            <div
              onClick={() => {
                onSelectChat('lounge', 'Nexus Global Lounge', '🌐', false);
                onCloseMobile?.();
              }}
              className={`p-2.5 rounded-xl cursor-pointer transition flex items-center gap-3 border ${
                activeChatId === 'lounge'
                  ? 'bg-blue-50 dark:bg-slate-800/90 border-blue-200 dark:border-slate-700 shadow-sm'
                  : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="relative w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-xl shrink-0">
                🌐
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white truncate flex items-center gap-1">
                    <Globe className="w-3 h-3 text-blue-500 shrink-0" />
                    Nexus Global Lounge
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Public community hub for everyone
                </p>
              </div>
            </div>

            {/* Separator / Header for Encrypted Contacts */}
            <div className="pt-3 pb-1 px-2 flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-500" />
                Personal Contacts (E2EE)
              </span>
              <span className="text-[10px] lowercase text-slate-400 font-normal">
                {filteredContacts.length} total
              </span>
            </div>

            {/* Empty state for contacts */}
            {filteredContacts.length === 0 && (
              <div className="p-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 my-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  No direct contacts added yet.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition inline-flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  Add Contact
                </button>
              </div>
            )}

            {/* Contact cards */}
            {filteredContacts.map((contact) => {
              const isActive = activeChatId === contact.username;
              return (
                <div
                  key={contact.username}
                  onClick={() => {
                    onSelectChat(contact.username, contact.username, contact.avatar, true);
                    onCloseMobile?.();
                  }}
                  className={`p-2.5 rounded-xl cursor-pointer transition flex items-center gap-3 border ${
                    isActive
                      ? 'bg-blue-50 dark:bg-slate-800/90 border-blue-200 dark:border-slate-700 shadow-sm'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="relative w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0">
                    {contact.avatar || '👤'}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white dark:border-slate-900 rounded-full ${
                        contact.online ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    ></span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white truncate flex items-center gap-1">
                        {contact.username}
                        <span title="End-To-End Encrypted">
                          <Lock className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatSidebarTimestamp(contact.lastMessageTime)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate pr-1">
                        {contact.lastMessageSnippet || 'Click to message...'}
                      </p>
                      {contact.unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-600 text-white shrink-0 min-w-4 text-center">
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          /* Directory List */
          <div className="space-y-1">
            <p className="px-2 py-1 text-[11px] text-slate-500 dark:text-slate-400">
              Users registered on this Nexus node. Click to initiate an encrypted direct message.
            </p>
            {filteredDirectory.length === 0 ? (
              <p className="p-4 text-xs text-center text-slate-400">
                No other registered users found.
              </p>
            ) : (
              filteredDirectory.map((user) => {
                const isAlreadyContact = contacts.some(
                  (c) => c.username.toLowerCase() === user.username.toLowerCase()
                );
                return (
                  <div
                    key={user.username}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base shrink-0">
                        {user.avatar || '👤'}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${
                            user.online ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        ></span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {user.username}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {user.online ? 'Online now' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onAddContact(user.username);
                        onSelectChat(user.username, user.username, user.avatar, true);
                        setActiveTab('chats');
                        onCloseMobile?.();
                      }}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition shrink-0"
                    >
                      {isAlreadyContact ? 'Message' : 'Connect'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* User Footer Profile & Open Source link */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between">
        <div
          onClick={onOpenSettings}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition min-w-0"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-base shrink-0">
            {myAvatar}
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {myUsername}
            </span>
            <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" />
              E2EE Active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onOpenOpenSource}
            title="Open Source Cryptographic Audit"
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition text-xs font-mono flex items-center gap-1"
          >
            <Code2 className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            title="Settings"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xl text-slate-900 dark:text-slate-100">
            <h3 className="font-bold text-base mb-1">Add Personal Contact</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter the username of a peer to establish an end-to-end encrypted session.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Peer Username
                </label>
                <input
                  type="text"
                  value={addUserInput}
                  onChange={(e) => {
                    setAddUserInput(e.target.value);
                    setAddError('');
                  }}
                  placeholder="e.g. Alice"
                  autoFocus
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {addError && <p className="text-xs text-red-500 mt-1">{addError}</p>}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setAddError('');
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
                >
                  Add &amp; Encrypt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
