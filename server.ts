import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UserProfile {
  username: string;
  avatar: string;
  publicKey?: string; // Exported JWK or SPKI for Web Crypto ECDH
  online: boolean;
  lastSeen: number;
}

interface ChatMessagePayload {
  id: string;
  sender: string;
  senderAvatar: string;
  target: string; // 'lounge' or recipient username
  text?: string;
  type: 'text' | 'image' | 'audio';
  media?: string; // base64 string
  timestamp: number;
  // End-To-End Encryption fields:
  isEncrypted?: boolean;
  encryptedPayload?: string; // base64 ciphertext
  iv?: string; // base64 initialization vector
  salt?: string;
  senderPublicKey?: string;
  reactions?: Record<string, string[]>; // emoji -> array of usernames
}

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e7, // 10MB to accommodate high-res base64 image attachments and audio notes
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In-Memory state store (Server-as-source-of-truth)
const registeredUsers = new Map<string, UserProfile>();
const socketUserMap = new Map<string, string>(); // socket.id -> username lowercase
const globalMessages: ChatMessagePayload[] = [];
// Encrypted direct conversations: conversationId (sorted lowercase "user1:user2") -> messages
const directConversations = new Map<string, ChatMessagePayload[]>();

function getConversationId(u1: string, u2: string): string {
  return [u1.toLowerCase(), u2.toLowerCase()].sort().join(':');
}

function broadcastDirectory() {
  const directory = Array.from(registeredUsers.values()).map(u => ({
    username: u.username,
    avatar: u.avatar,
    publicKey: u.publicKey,
    online: u.online,
    lastSeen: u.lastSeen,
  }));
  io.emit('directory:update', directory);
}

// Health & Open-Source Transparency API endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'Nexus Chat Server',
    e2eeStandard: 'Web Crypto API AES-256-GCM / ECDH P-256',
    zeroKnowledgeRelay: true,
    onlineCount: Array.from(registeredUsers.values()).filter(u => u.online).length,
    registeredCount: registeredUsers.size,
    timestamp: Date.now(),
  });
});

app.get('/api/transparency', (req, res) => {
  res.json({
    protocol: 'Nexus E2EE Protocol v1.0',
    keyExchange: 'ECDH P-256 (NIST SP 800-56A)',
    cipher: 'AES-GCM 256-bit with unique 96-bit random IV per message',
    zeroKnowledgeGuarantee: 'Server acts purely as an encrypted payload relay. Private keys are generated on client and never leave the user browser.',
    openSourceRepository: 'https://github.com/nexus-chat/nexus',
  });
});

io.on('connection', (socket: Socket) => {
  // Handle user registration or reconnect
  socket.on('user:register', (data: { username: string; avatar: string; publicKey?: string }) => {
    if (!data?.username) return;
    const cleanUsername = data.username.trim();
    const key = cleanUsername.toLowerCase();

    const existing = registeredUsers.get(key);
    registeredUsers.set(key, {
      username: cleanUsername,
      avatar: data.avatar || '🚀',
      publicKey: data.publicKey || existing?.publicKey,
      online: true,
      lastSeen: Date.now(),
    });

    socketUserMap.set(socket.id, key);
    socket.join(`user:${key}`);

    // Send initial directory and recent global messages
    broadcastDirectory();
    socket.emit('history:global', globalMessages.slice(-100));
  });

  // Fetch conversation history
  socket.on('history:fetch', ({ target }: { target: string }) => {
    const currentUsername = socketUserMap.get(socket.id);
    if (!currentUsername) return;

    if (target === 'lounge') {
      socket.emit('history:global', globalMessages.slice(-100));
    } else {
      const convId = getConversationId(currentUsername, target);
      const messages = directConversations.get(convId) || [];
      socket.emit('history:direct', { target, messages });
    }
  });

  // Handle incoming message (Global Lobby or Encrypted Direct Message)
  socket.on('message:send', (msg: ChatMessagePayload) => {
    if (!msg || !msg.sender) return;

    // Normalizing message timestamp and ID
    const enrichedMsg: ChatMessagePayload = {
      ...msg,
      id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: msg.timestamp || Date.now(),
      reactions: msg.reactions || {},
    };

    if (enrichedMsg.target === 'lounge') {
      // Global Lounge message: accessible to everyone
      globalMessages.push(enrichedMsg);
      if (globalMessages.length > 200) {
        globalMessages.shift();
      }
      io.emit('message:receive', enrichedMsg);
    } else {
      // Direct Encrypted Message
      const targetUser = enrichedMsg.target.toLowerCase();
      const senderUser = enrichedMsg.sender.toLowerCase();
      const convId = getConversationId(senderUser, targetUser);

      let conv = directConversations.get(convId);
      if (!conv) {
        conv = [];
        directConversations.set(convId, conv);
      }
      conv.push(enrichedMsg);
      if (conv.length > 300) {
        conv.shift();
      }

      // Relay encrypted packet to recipient room
      io.to(`user:${targetUser}`).emit('message:receive', enrichedMsg);
      // Relay back to sender room (to sync multiple tabs/sessions of the sender)
      io.to(`user:${senderUser}`).emit('message:receive', enrichedMsg);
    }
  });

  // Handle message reactions
  socket.on('message:react', ({ messageId, target, emoji, username }: { messageId: string; target: string; emoji: string; username: string }) => {
    if (!messageId || !emoji || !username) return;

    const applyReaction = (msgList: ChatMessagePayload[]) => {
      const msg = msgList.find(m => m.id === messageId);
      if (msg) {
        if (!msg.reactions) msg.reactions = {};
        if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
        const index = msg.reactions[emoji].indexOf(username);
        if (index > -1) {
          msg.reactions[emoji].splice(index, 1);
          if (msg.reactions[emoji].length === 0) {
            delete msg.reactions[emoji];
          }
        } else {
          msg.reactions[emoji].push(username);
        }
        return msg;
      }
      return null;
    };

    let updatedMsg: ChatMessagePayload | null = null;
    if (target === 'lounge') {
      updatedMsg = applyReaction(globalMessages);
      if (updatedMsg) {
        io.emit('message:updated', updatedMsg);
      }
    } else {
      const sender = socketUserMap.get(socket.id);
      if (sender) {
        const convId = getConversationId(sender, target);
        const conv = directConversations.get(convId);
        if (conv) {
          updatedMsg = applyReaction(conv);
          if (updatedMsg) {
            io.to(`user:${sender}`).emit('message:updated', updatedMsg);
            io.to(`user:${target.toLowerCase()}`).emit('message:updated', updatedMsg);
          }
        }
      }
    }
  });

  // Typing indicators
  socket.on('typing:update', ({ username, target, isTyping }: { username: string; target: string; isTyping: boolean }) => {
    if (target === 'lounge') {
      socket.broadcast.emit('typing:update', { username, target, isTyping });
    } else {
      io.to(`user:${target.toLowerCase()}`).emit('typing:update', { username, target: username, isTyping });
    }
  });

  // Clear chat option
  socket.on('chat:clear', ({ target }: { target: string }) => {
    const sender = socketUserMap.get(socket.id);
    if (!sender) return;

    if (target === 'lounge') {
      // Clear for everyone in global lobby
      globalMessages.length = 0;
      io.emit('chat:cleared', { target: 'lounge' });
    } else {
      const convId = getConversationId(sender, target);
      directConversations.delete(convId);
      io.to(`user:${sender}`).emit('chat:cleared', { target });
      io.to(`user:${target.toLowerCase()}`).emit('chat:cleared', { target: sender });
    }
  });

  // Secure account deletion & session wipe
  socket.on('account:delete', () => {
    const user = socketUserMap.get(socket.id);
    if (user) {
      registeredUsers.delete(user);
      // Remove all user's direct messages for privacy
      for (const [convId] of directConversations.entries()) {
        if (convId.startsWith(`${user}:`) || convId.endsWith(`:${user}`)) {
          directConversations.delete(convId);
        }
      }
      socketUserMap.delete(socket.id);
      socket.leave(`user:${user}`);
      broadcastDirectory();
      socket.emit('account:deleted');
    }
  });

  socket.on('disconnect', () => {
    const user = socketUserMap.get(socket.id);
    if (user) {
      const userObj = registeredUsers.get(user);
      if (userObj) {
        userObj.online = false;
        userObj.lastSeen = Date.now();
      }
      socketUserMap.delete(socket.id);
      broadcastDirectory();
    }
  });
});

// Vite Middleware integration in Dev / Static serving in Production
async function startServer() {
  const PORT = process.env.PORT || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`Nexus Full-Stack Chat Server running on port ${PORT}`);
  });
}

startServer();
