import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Image as ImageIcon,
  Smile,
  Mic,
  Square,
  X,
  Paperclip,
} from 'lucide-react';
import { playSentMessageSound } from '../utils/sound';

interface ChatInputProps {
  onSendMessage: (text: string, type?: 'text' | 'image' | 'audio', media?: string) => void;
  onTyping: (isTyping: boolean) => void;
  placeholder?: string;
}

const EMOJI_CATEGORIES = [
  { name: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😎', '🤓', '🧐'] },
  { name: 'Gestures', emojis: ['👍', '👎', '👏', '🙌', '🤝', '👊', '✌️', '🤞', '🤟', '🤙', '👋', '🙏', '💪'] },
  { name: 'Hearts & Vibes', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '✨', '🔥', '⭐', '⚡', '🚀', '🎉', '💯'] },
  { name: 'Expressions', emojis: ['🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😴', '🤯', '🥳', '🥺', '😳', '😱'] },
];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onTyping,
  placeholder = 'Type a message...',
}) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Close emoji picker when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);

    // Notify typing
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleSend = () => {
    const cleanText = text.trim();
    if (!cleanText && !attachedImage) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onTyping(false);

    if (attachedImage) {
      onSendMessage(cleanText, 'image', attachedImage);
      setAttachedImage(null);
    } else {
      onSendMessage(cleanText, 'text');
    }

    setText('');
    setShowEmojiPicker(false);
    playSentMessageSound();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Image size exceeds 8MB limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAttachedImage(base64);
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          onSendMessage('Voice Note', 'audio', base64);
          playSentMessageSound();
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access is not supported or was denied.');
    }
  };

  const stopRecording = (send: boolean) => {
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    if (mediaRecorderRef.current && isRecording) {
      if (!send) {
        mediaRecorderRef.current.onstop = null;
      }
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const formatRecordTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="p-3 md:p-4 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm relative">
      {/* Attached Image Preview */}
      {attachedImage && (
        <div className="mb-3 relative inline-block">
          <img
            src={attachedImage}
            alt="Upload Preview"
            className="w-24 h-24 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
          />
          <button
            onClick={() => setAttachedImage(null)}
            className="absolute -top-2 -right-2 p-1 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-18 left-4 z-30 w-72 sm:w-80 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
            <span className="text-xs font-semibold text-slate-500">Emoji Picker</span>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {EMOJI_CATEGORIES.map((category) => (
              <div key={category.name}>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                  {category.name}
                </span>
                <div className="grid grid-cols-7 gap-1">
                  {category.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setText((prev) => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="p-1.5 text-base hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Main Input Controls */}
      <div className="flex items-center gap-2">
        {isRecording ? (
          /* Live Audio Recording HUD */
          <div className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-medium animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></span>
              <span>Recording Voice Note: {formatRecordTime(recordingSeconds)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => stopRecording(false)}
                className="px-2 py-1 rounded hover:bg-red-100 dark:hover:bg-red-900/50 text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => stopRecording(true)}
                className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700"
              >
                Send Voice
              </button>
            </div>
          </div>
        ) : (
          /* Standard Text & Attachment Input */
          <>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Insert Emoji"
                className="p-2 rounded-xl text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Smile className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach Image"
                className="p-2 rounded-xl text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              value={text}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 py-2.5 px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />

            <button
              type="button"
              onClick={startRecording}
              title="Record Voice Note"
              className="p-2.5 rounded-xl text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
            >
              <Mic className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim() && !attachedImage}
              title="Send Message"
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white shadow-sm transition active:scale-95 shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
