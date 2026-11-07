export interface UserProfile {
  username: string;
  avatar: string;
  publicKey?: JsonWebKey;
  fingerprint?: string;
}

export interface ContactInfo {
  username: string;
  avatar: string;
  publicKey?: JsonWebKey;
  fingerprint?: string;
  online: boolean;
  lastSeen?: number;
  unreadCount: number;
  lastMessageSnippet?: string;
  lastMessageTime?: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  senderAvatar: string;
  target: string; // 'lounge' or recipient username
  text?: string;
  type: 'text' | 'image' | 'audio';
  media?: string; // base64 string
  timestamp: number;
  isEncrypted?: boolean;
  encryptedPayload?: string;
  iv?: string;
  reactions?: Record<string, string[]>; // emoji -> array of usernames
  isDecrypted?: boolean;
}

export interface TypingIndicator {
  username: string;
  target: string;
  isTyping: boolean;
}
