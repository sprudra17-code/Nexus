import React, { useEffect, useRef, useState } from 'react';
import {
  Lock,
  Globe,
  Play,
  Pause,
  CheckCheck,
  Check,
  Smile,
  ShieldCheck,
} from 'lucide-react';
import { ChatMessage } from '../types/chat';

interface ChatFeedProps {
  messages: ChatMessage[];
  myUsername: string;
  isEncryptedChat: boolean;
  activeChatTitle: string;
  typingUsers: string[];
  onOpenLightbox: (src: string) => void;
  onReactToMessage: (messageId: string, emoji: string) => void;
}

const QUICK_REACTIONS = ['🔥', '❤️', '👍', '🚀', '😂', '👏'];

export const ChatFeed: React.FC<ChatFeedProps> = ({
  messages,
  myUsername,
  isEncryptedChat,
  activeChatTitle,
  typingUsers,
  onOpenLightbox,
  onReactToMessage,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll to bottom on new message or typing indicator
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typingUsers.length]);

  const toggleAudio = (id: string, src?: string) => {
    if (!src) return;
    if (playingAudioId === id) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(src);
      audioRef.current = audio;
      setPlayingAudioId(id);
      audio.play().catch(() => setPlayingAudioId(null));
      audio.onended = () => setPlayingAudioId(null);
    }
  };

  // Group messages by Date
  const getDateLabel = (timestamp: number) => {
    const d = new Date(timestamp);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
      {/* Encryption / Global Banner at top of conversation */}
      <div className="max-w-md mx-auto my-3 text-center">
        {isEncryptedChat ? (
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
            <div className="flex items-center justify-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>End-to-End Encrypted Session</span>
            </div>
            <p className="text-[11px] text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed">
              Messages in this direct conversation are encrypted on your device with AES-GCM-256. No one outside of this chat, not even the Nexus server, can read or listen to them.
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300 space-y-0.5">
            <div className="flex items-center justify-center gap-1.5 font-bold">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              <span>Nexus Global Lounge</span>
            </div>
            <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80">
              This is a shared open channel visible in real-time to everyone on the platform.
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      {messages.map((msg, index) => {
        const isMe = msg.sender.toLowerCase() === myUsername.toLowerCase();
        const prevMsg = messages[index - 1];
        const showDateDivider = !prevMsg || getDateLabel(prevMsg.timestamp) !== getDateLabel(msg.timestamp);

        const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <React.Fragment key={msg.id || index}>
            {showDateDivider && (
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shadow-2xs">
                  {getDateLabel(msg.timestamp)}
                </span>
              </div>
            )}

            <div className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}>
              <div
                className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 transition shadow-2xs ${
                  isMe
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-xs'
                }`}
              >
                {/* Floating Reaction Bar on hover */}
                <div
                  className={`absolute -top-7 ${
                    isMe ? 'right-0' : 'left-0'
                  } hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5 shadow-md z-10`}
                >
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onReactToMessage(msg.id, emoji)}
                      className="hover:scale-125 transition text-xs p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Sender Title in received or global messages */}
                {!isMe && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">
                    <span>{msg.senderAvatar || '👤'}</span>
                    <span>{msg.sender}</span>
                    {msg.isEncrypted && (
                      <span title="Decrypted Locally">
                        <Lock className="w-2.5 h-2.5 text-emerald-500" />
                      </span>
                    )}
                  </div>
                )}

                {/* Content: Text / Image / Audio */}
                {msg.type === 'image' && msg.media && (
                  <div className="my-1">
                    <img
                      src={msg.media}
                      alt="Attachment"
                      onClick={() => onOpenLightbox(msg.media!)}
                      className="rounded-xl max-h-72 object-cover cursor-pointer hover:opacity-95 transition border border-black/10"
                    />
                    {msg.text && (
                      <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>
                )}

                {msg.type === 'audio' && (
                  <div className="flex items-center gap-3 py-1 min-w-[200px]">
                    <button
                      type="button"
                      onClick={() => toggleAudio(msg.id, msg.media)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition shrink-0 ${
                        isMe
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'bg-blue-600 text-white shadow-sm'
                      }`}
                    >
                      {playingAudioId === msg.id ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center gap-1 h-5">
                        {[40, 70, 30, 90, 60, 80, 45, 95, 30, 65, 85].map((height, i) => (
                          <div
                            key={i}
                            style={{ height: `${height}%` }}
                            className={`w-1 rounded-full transition-all ${
                              playingAudioId === msg.id
                                ? isMe
                                  ? 'bg-white animate-pulse'
                                  : 'bg-blue-500 animate-pulse'
                                : isMe
                                ? 'bg-blue-300'
                                : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span
                        className={`text-[10px] ${
                          isMe ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        Voice Note
                      </span>
                    </div>
                  </div>
                )}

                {msg.type === 'text' && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>
                )}

                {/* Reactions badge list */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5 pt-1">
                    {Object.entries(msg.reactions).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        onClick={() => onReactToMessage(msg.id, emoji)}
                        className={`px-1.5 py-0.5 rounded-full text-[11px] flex items-center gap-1 border transition ${
                          users.includes(myUsername)
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-700 dark:text-blue-300'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-300/80 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{emoji}</span>
                        <span className="font-semibold text-[10px]">{users.length}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Timestamp & status ticks */}
                <div
                  className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                    isMe ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  <span>{timeStr}</span>
                  {isMe && (
                    <span title="Delivered">
                      <CheckCheck className="w-3.5 h-3.5 inline text-blue-200" />
                    </span>
                  )}
                  {msg.isEncrypted && (
                    <span title="End-to-End Encrypted">
                      <Lock className="w-2.5 h-2.5 inline text-emerald-400" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-1 px-3">
          <div className="flex gap-1 items-center bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-2xs">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
            <span className="ml-1 font-medium text-slate-600 dark:text-slate-300">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
