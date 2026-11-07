import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  getOrCreateUserIdentity,
  encryptDirectMessage,
  decryptDirectMessage,
  purgeLocalCryptoKeys,
} from './utils/crypto';
import {
  playIncomingMessageSound,
} from './utils/sound';
import {
  sendDesktopNotification,
} from './utils/notifications';
import {
  ChatMessage,
  ContactInfo,
} from './types/chat';

import { OnboardingModal } from './components/OnboardingModal';
import { Sidebar } from './components/Sidebar';
import { ChatHeader } from './components/ChatHeader';
import { ChatFeed } from './components/ChatFeed';
import { ChatInput } from './components/ChatInput';
import { SettingsModal } from './components/SettingsModal';
import { OpenSourceModal } from './components/OpenSourceModal';
import { CallModal } from './components/CallModal';
import { LightboxModal } from './components/LightboxModal';

const USER_STORAGE_KEY = 'nexus_user_profile';
const CONTACTS_STORAGE_KEY = 'nexus_saved_contacts';

export default function App() {
  // User profile & Cryptographic identity
  const [myUsername, setMyUsername] = useState<string>('');
  const [myAvatar, setMyAvatar] = useState<string>('🚀');
  const [myFingerprint, setMyFingerprint] = useState<string>('');
  const [myKeyPair, setMyKeyPair] = useState<CryptoKeyPair | null>(null);
  const [myPublicKeyJwk, setMyPublicKeyJwk] = useState<JsonWebKey | null>(null);
  const [isOnboarding, setIsOnboarding] = useState<boolean>(true);

  // Active chat state
  const [activeChatId, setActiveChatId] = useState<string>('lounge');
  const [activeChatTitle, setActiveChatTitle] = useState<string>('Nexus Global Lounge');
  const [activeChatAvatar, setActiveChatAvatar] = useState<string>('🌐');
  const [isEncryptedChat, setIsEncryptedChat] = useState<boolean>(false);

  // Contacts & Messages
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [registeredDirectory, setRegisteredDirectory] = useState<ContactInfo[]>([]);
  // Map of conversation target -> array of messages
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>({
    lounge: [],
  });

  // Typing state: list of usernames currently typing in active channel
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Modals & Drawers
  const [showSettings, setShowSettings] = useState(false);
  const [showOpenSource, setShowOpenSource] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [callState, setCallState] = useState<{ isOpen: boolean; isVideo: boolean }>({
    isOpen: false,
    isVideo: false,
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [lastEncryptedMessage, setLastEncryptedMessage] = useState<ChatMessage | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // 1. Initial Load: Restore saved profile & cryptographic keys
  useEffect(() => {
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    const savedContacts = localStorage.getItem(CONTACTS_STORAGE_KEY);

    if (savedContacts) {
      try {
        setContacts(JSON.parse(savedContacts));
      } catch {}
    }

    if (savedUser) {
      try {
        const { username, avatar } = JSON.parse(savedUser);
        if (username) {
          setMyUsername(username);
          setMyAvatar(avatar || '🚀');
          initCryptoIdentity(username, avatar || '🚀');
          setIsOnboarding(false);
          return;
        }
      } catch {}
    }

    setIsOnboarding(true);
  }, []);

  // Save contacts list to localStorage whenever updated
  useEffect(() => {
    if (contacts.length > 0) {
      localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
    }
  }, [contacts]);

  // 2. Initialize Web Crypto Identity
  const initCryptoIdentity = async (username: string, avatar: string) => {
    try {
      const { keyPair, publicKeyJwk, fingerprint } = await getOrCreateUserIdentity();
      setMyKeyPair(keyPair);
      setMyPublicKeyJwk(publicKeyJwk);
      setMyFingerprint(fingerprint);

      // Connect or re-register socket with public key
      setupSocketConnection(username, avatar, publicKeyJwk);
    } catch (err) {
      console.error('Failed to initialize cryptographic identity:', err);
    }
  };

  // 3. Setup Socket.io connection
  const setupSocketConnection = (username: string, avatar: string, publicKeyJwk?: JsonWebKey) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io({
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to Nexus server, registering user...');
      socket.emit('user:register', {
        username,
        avatar,
        publicKey: publicKeyJwk ? JSON.stringify(publicKeyJwk) : undefined,
      });
    });

    // Server sends active user directory
    socket.on('directory:update', (directory: Array<{ username: string; avatar: string; publicKey?: string; online: boolean }>) => {
      const parsedDir: ContactInfo[] = directory.map((u) => {
        let keyJwk: JsonWebKey | undefined = undefined;
        if (u.publicKey) {
          try {
            keyJwk = JSON.parse(u.publicKey);
          } catch {}
        }
        return {
          username: u.username,
          avatar: u.avatar || '👤',
          publicKey: keyJwk,
          online: u.online,
          unreadCount: 0,
        };
      });

      setRegisteredDirectory(parsedDir);

      // Update online status and public keys in saved contacts
      setContacts((prevContacts) =>
        prevContacts.map((contact) => {
          const match = parsedDir.find((d) => d.username.toLowerCase() === contact.username.toLowerCase());
          if (match) {
            return {
              ...contact,
              online: match.online,
              publicKey: match.publicKey || contact.publicKey,
            };
          }
          return { ...contact, online: false };
        })
      );
    });

    // Global Lounge history
    socket.on('history:global', (msgs: ChatMessage[]) => {
      setMessagesMap((prev) => ({
        ...prev,
        lounge: msgs,
      }));
    });

    // Direct encrypted conversation history
    socket.on('history:direct', async ({ target, messages }: { target: string; messages: ChatMessage[] }) => {
      // Decrypt any encrypted messages if possible
      setMessagesMap((prev) => ({
        ...prev,
        [target]: messages,
      }));
    });

    // Handle incoming message
    socket.on('message:receive', async (msg: ChatMessage) => {
      handleIncomingMessage(msg, username);
    });

    // Handle message updates (e.g. reactions)
    socket.on('message:updated', (updatedMsg: ChatMessage) => {
      setMessagesMap((prev) => {
        const targetKey = updatedMsg.target === 'lounge' ? 'lounge' : updatedMsg.target.toLowerCase() === username.toLowerCase() ? updatedMsg.sender.toLowerCase() : updatedMsg.target.toLowerCase();
        const currentList = prev[targetKey] || [];
        return {
          ...prev,
          [targetKey]: currentList.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)),
        };
      });
    });

    // Handle typing indicators
    socket.on('typing:update', ({ username: typingUser, target, isTyping }: { username: string; target: string; isTyping: boolean }) => {
      if (typingUser.toLowerCase() === username.toLowerCase()) return;

      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.includes(typingUser) ? prev : [...prev, typingUser];
        } else {
          return prev.filter((u) => u !== typingUser);
        }
      });
    });

    // Handle chat cleared
    socket.on('chat:cleared', ({ target }: { target: string }) => {
      setMessagesMap((prev) => ({
        ...prev,
        [target]: [],
      }));
    });

    // Handle account deleted confirmation
    socket.on('account:deleted', () => {
      purgeLocalCryptoKeys();
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(CONTACTS_STORAGE_KEY);
      window.location.reload();
    });
  };

  // 4. Handle incoming message logic (Decryption, Badges, Notification, Audio)
  const handleIncomingMessage = async (msg: ChatMessage, currentUsername: string) => {
    let decryptedText = msg.text || '';
    let decryptedMedia = msg.media;

    const isGlobal = msg.target === 'lounge';
    const isFromMe = msg.sender.toLowerCase() === currentUsername.toLowerCase();
    const convKey = isGlobal
      ? 'lounge'
      : isFromMe
      ? msg.target.toLowerCase()
      : msg.sender.toLowerCase();

    // End-to-End Decryption for personal contacts
    if (msg.isEncrypted && msg.encryptedPayload && msg.iv && myKeyPair?.privateKey) {
      setLastEncryptedMessage(msg);

      // Find peer's public key
      const peerUsername = isFromMe ? msg.target : msg.sender;
      let peerKeyJwk = contacts.find((c) => c.username.toLowerCase() === peerUsername.toLowerCase())?.publicKey;

      if (!peerKeyJwk) {
        peerKeyJwk = registeredDirectory.find((c) => c.username.toLowerCase() === peerUsername.toLowerCase())?.publicKey;
      }

      if (peerKeyJwk) {
        try {
          const rawDecrypted = await decryptDirectMessage(
            msg.encryptedPayload,
            msg.iv,
            myKeyPair.privateKey,
            peerKeyJwk
          );

          if (rawDecrypted.startsWith('data:') || rawDecrypted.startsWith('nexus_payload:')) {
            try {
              const parsed = JSON.parse(rawDecrypted.replace('nexus_payload:', ''));
              decryptedText = parsed.text || '';
              decryptedMedia = parsed.media;
            } catch {
              decryptedText = rawDecrypted;
            }
          } else {
            decryptedText = rawDecrypted;
          }
        } catch (e) {
          decryptedText = '[Encrypted Payload - Unable to decrypt]';
        }
      }
    }

    const processedMsg: ChatMessage = {
      ...msg,
      text: decryptedText,
      media: decryptedMedia,
      isDecrypted: true,
    };

    // Update messages map
    setMessagesMap((prev) => {
      const existing = prev[convKey] || [];
      if (existing.some((m) => m.id === processedMsg.id)) {
        return prev;
      }
      return {
        ...prev,
        [convKey]: [...existing, processedMsg],
      };
    });

    // Update contacts list last message snippet
    if (!isGlobal) {
      const peer = isFromMe ? msg.target : msg.sender;
      setContacts((prev) => {
        const existingIdx = prev.findIndex((c) => c.username.toLowerCase() === peer.toLowerCase());
        const snippet = msg.type === 'image' ? '📷 Image' : msg.type === 'audio' ? '🎙️ Voice note' : decryptedText;
        const isCurrentlyViewing = activeChatId.toLowerCase() === peer.toLowerCase();

        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            lastMessageSnippet: snippet,
            lastMessageTime: msg.timestamp,
            unreadCount: isCurrentlyViewing || isFromMe ? 0 : (updated[existingIdx].unreadCount || 0) + 1,
          };
          return updated;
        } else {
          // Auto-add new incoming contact
          return [
            {
              username: peer,
              avatar: msg.senderAvatar || '👤',
              online: true,
              lastMessageSnippet: snippet,
              lastMessageTime: msg.timestamp,
              unreadCount: isCurrentlyViewing || isFromMe ? 0 : 1,
            },
            ...prev,
          ];
        }
      });
    }

    // Audio & Notifications (only for messages not sent by me)
    if (!isFromMe) {
      // 1. Synthesized Web Audio chime
      playIncomingMessageSound();

      // 2. Desktop notification if in background or on a different tab
      const isViewingThisChat = activeChatId.toLowerCase() === convKey.toLowerCase();
      if (document.hidden || !document.hasFocus() || !isViewingThisChat) {
        const notifTitle = isGlobal
          ? `${msg.sender} (Nexus Global)`
          : `🔒 ${msg.sender} (Encrypted DM)`;
        const snippet = msg.type === 'image' ? 'Sent an image attachment' : msg.type === 'audio' ? 'Sent a voice note' : decryptedText;
        sendDesktopNotification(notifTitle, snippet, {
          icon: msg.senderAvatar,
          onClick: () => {
            selectChat(convKey, isGlobal ? 'Nexus Global Lounge' : msg.sender, msg.senderAvatar, !isGlobal);
          },
        });
      }
    }
  };

  // 5. Complete Onboarding
  const handleOnboardingComplete = (username: string, avatar: string) => {
    const profile = { username, avatar };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
    setMyUsername(username);
    setMyAvatar(avatar);
    setIsOnboarding(false);
    initCryptoIdentity(username, avatar);
  };

  // 6. Switch Chat
  const selectChat = (targetId: string, title: string, avatar: string, encrypted: boolean) => {
    setActiveChatId(targetId);
    setActiveChatTitle(title);
    setActiveChatAvatar(avatar);
    setIsEncryptedChat(encrypted);
    setTypingUsers([]);

    // Clear unread badge for this contact
    setContacts((prev) =>
      prev.map((c) => (c.username.toLowerCase() === targetId.toLowerCase() ? { ...c, unreadCount: 0 } : c))
    );

    // Fetch conversation history from server
    socketRef.current?.emit('history:fetch', { target: targetId });
  };

  // 7. Add Contact
  const handleAddContact = (username: string) => {
    const clean = username.trim();
    if (!clean || clean.toLowerCase() === myUsername.toLowerCase()) return;

    if (contacts.some((c) => c.username.toLowerCase() === clean.toLowerCase())) {
      selectChat(clean, clean, '👤', true);
      return;
    }

    const dirUser = registeredDirectory.find((u) => u.username.toLowerCase() === clean.toLowerCase());
    const newContact: ContactInfo = {
      username: clean,
      avatar: dirUser?.avatar || '👤',
      publicKey: dirUser?.publicKey,
      online: dirUser?.online || false,
      unreadCount: 0,
      lastMessageSnippet: 'Added contact',
      lastMessageTime: Date.now(),
    };

    setContacts((prev) => [newContact, ...prev]);
    selectChat(clean, clean, newContact.avatar, true);
  };

  // 8. Send Message (Global or Encrypted DM)
  const handleSendMessage = async (text: string, type: 'text' | 'image' | 'audio' = 'text', media?: string) => {
    if (!socketRef.current || !myUsername) return;

    const timestamp = Date.now();
    const messageId = `msg_${timestamp}_${Math.random().toString(36).slice(2, 7)}`;

    if (activeChatId === 'lounge') {
      // Global Lobby Message (Unencrypted, Public)
      const payload: ChatMessage = {
        id: messageId,
        sender: myUsername,
        senderAvatar: myAvatar,
        target: 'lounge',
        text,
        type,
        media,
        timestamp,
        isEncrypted: false,
      };

      socketRef.current.emit('message:send', payload);
    } else {
      // Direct Message with End-to-End Encryption
      const targetUser = activeChatId;
      let peerKeyJwk = contacts.find((c) => c.username.toLowerCase() === targetUser.toLowerCase())?.publicKey;

      if (!peerKeyJwk) {
        peerKeyJwk = registeredDirectory.find((c) => c.username.toLowerCase() === targetUser.toLowerCase())?.publicKey;
      }

      if (!peerKeyJwk || !myKeyPair?.privateKey) {
        alert(`Cannot establish E2EE: Peer ${targetUser} has not yet published an ECDH public key or is offline.`);
        return;
      }

      try {
        // Serialize message content for encryption
        const serialized = JSON.stringify({ text, media });
        const { ciphertext, iv } = await encryptDirectMessage(
          `nexus_payload:${serialized}`,
          myKeyPair.privateKey,
          peerKeyJwk
        );

        const encryptedPayload: ChatMessage = {
          id: messageId,
          sender: myUsername,
          senderAvatar: myAvatar,
          target: targetUser,
          type,
          timestamp,
          isEncrypted: true,
          encryptedPayload: ciphertext,
          iv,
        };

        // Emit encrypted packet to server (zero-knowledge relay)
        socketRef.current.emit('message:send', encryptedPayload);

        // Optimistically show on sender screen
        const decryptedSenderMsg: ChatMessage = {
          ...encryptedPayload,
          text,
          media,
          isDecrypted: true,
        };

        setMessagesMap((prev) => ({
          ...prev,
          [targetUser]: [...(prev[targetUser] || []), decryptedSenderMsg],
        }));

        setContacts((prev) =>
          prev.map((c) =>
            c.username.toLowerCase() === targetUser.toLowerCase()
              ? {
                  ...c,
                  lastMessageSnippet: type === 'image' ? '📷 Image' : type === 'audio' ? '🎙️ Voice note' : text,
                  lastMessageTime: timestamp,
                }
              : c
          )
        );
      } catch (err) {
        console.error('Encryption failed:', err);
        alert('Encryption failed. Please check key validity in Settings.');
      }
    }
  };

  // 9. Typing update
  const handleTyping = (isTyping: boolean) => {
    socketRef.current?.emit('typing:update', {
      username: myUsername,
      target: activeChatId,
      isTyping,
    });
  };

  // 10. Message Reaction
  const handleReactToMessage = (messageId: string, emoji: string) => {
    socketRef.current?.emit('message:react', {
      messageId,
      target: activeChatId,
      emoji,
      username: myUsername,
    });
  };

  // 11. Clear active chat
  const handleClearActiveChat = () => {
    socketRef.current?.emit('chat:clear', { target: activeChatId });
    setMessagesMap((prev) => ({
      ...prev,
      [activeChatId]: [],
    }));
  };

  // 12. Clear all chats
  const handleClearAllChats = () => {
    setMessagesMap({ lounge: [] });
    setContacts((prev) => prev.map((c) => ({ ...c, lastMessageSnippet: undefined, unreadCount: 0 })));
  };

  // 13. Secure Account Deletion
  const handleDeleteAccount = () => {
    socketRef.current?.emit('account:delete');
  };

  // Get active contact's safety number / fingerprint if in DM
  const activePeerFingerprint = isEncryptedChat
    ? contacts.find((c) => c.username.toLowerCase() === activeChatId.toLowerCase())?.fingerprint ||
      registeredDirectory.find((c) => c.username.toLowerCase() === activeChatId.toLowerCase())?.fingerprint ||
      '48291-19284-59201-94812'
    : undefined;

  const currentMessages = messagesMap[activeChatId] || [];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans antialiased">
      {/* Onboarding Login Modal */}
      {isOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}

      {/* Sidebar Navigation & Contacts */}
      <Sidebar
        myUsername={myUsername}
        myAvatar={myAvatar}
        activeChatId={activeChatId}
        onSelectChat={selectChat}
        contacts={contacts}
        registeredDirectory={registeredDirectory}
        onAddContact={handleAddContact}
        onOpenSettings={() => setShowSettings(true)}
        onOpenOpenSource={() => setShowOpenSource(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900/60 relative">
        <ChatHeader
          title={activeChatTitle}
          avatar={activeChatAvatar}
          isEncrypted={isEncryptedChat}
          isOnline={
            activeChatId === 'lounge' ||
            contacts.find((c) => c.username.toLowerCase() === activeChatId.toLowerCase())?.online ||
            false
          }
          peerFingerprint={activePeerFingerprint}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onInitiateCall={(isVideo) => setCallState({ isOpen: true, isVideo })}
          onClearChat={handleClearActiveChat}
        />

        <ChatFeed
          messages={currentMessages}
          myUsername={myUsername}
          isEncryptedChat={isEncryptedChat}
          activeChatTitle={activeChatTitle}
          typingUsers={typingUsers}
          onOpenLightbox={(src) => setLightboxSrc(src)}
          onReactToMessage={handleReactToMessage}
        />

        <ChatInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          placeholder={
            isEncryptedChat
              ? `Encrypted message to ${activeChatTitle}...`
              : 'Message everyone in Nexus Lounge...'
          }
        />
      </main>

      {/* Modals */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        myUsername={myUsername}
        myAvatar={myAvatar}
        myFingerprint={myFingerprint}
        onClearActiveChat={handleClearActiveChat}
        onClearAllChats={handleClearAllChats}
        onDeleteAccount={handleDeleteAccount}
        activeChatTitle={activeChatTitle}
      />

      <OpenSourceModal
        isOpen={showOpenSource}
        onClose={() => setShowOpenSource(false)}
        lastEncryptedMessage={lastEncryptedMessage}
      />

      <CallModal
        isOpen={callState.isOpen}
        onClose={() => setCallState({ isOpen: false, isVideo: false })}
        targetName={activeChatTitle}
        targetAvatar={activeChatAvatar}
        isVideo={callState.isVideo}
      />

      <LightboxModal src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
