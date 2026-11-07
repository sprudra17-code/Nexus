/**
 * End-To-End Encryption (E2EE) Utility using native Web Crypto API (SubtleCrypto)
 * - Algorithm: ECDH P-256 for key agreement
 * - Cipher: AES-256-GCM with unique 12-byte IV per message
 * - Zero-knowledge architecture: Keys are stored exclusively on client
 */

export interface KeyPairData {
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  fingerprint: string;
}

const STORAGE_KEY = 'nexus_e2ee_keys_v1';

// Convert ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Base64 to Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Generate human-readable cryptographic fingerprint / safety number from public key
export async function generateFingerprint(jwk: JsonWebKey): Promise<string> {
  const str = `${jwk.x}:${jwk.y}`;
  const enc = new TextEncoder().encode(str);
  const hashBuf = await window.crypto.subtle.digest('SHA-256', enc);
  const hashBytes = new Uint8Array(hashBuf);
  // Format as 6 groups of 5-digit numbers (like Signal safety numbers)
  let numStr = '';
  for (let i = 0; i < 15; i++) {
    const num = (hashBytes[i * 2] * 256 + hashBytes[i * 2 + 1]) % 100000;
    numStr += num.toString().padStart(5, '0') + (i % 3 === 2 && i < 14 ? '  ' : ' ');
  }
  return numStr.trim();
}

// Initialize or load user's cryptographic identity
export async function getOrCreateUserIdentity(): Promise<{
  keyPair: CryptoKeyPair;
  publicKeyJwk: JsonWebKey;
  fingerprint: string;
}> {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed: KeyPairData = JSON.parse(saved);
      const publicKey = await window.crypto.subtle.importKey(
        'jwk',
        parsed.publicKeyJwk,
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        []
      );
      const privateKey = await window.crypto.subtle.importKey(
        'jwk',
        parsed.privateKeyJwk,
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey', 'deriveBits']
      );
      return {
        keyPair: { publicKey, privateKey },
        publicKeyJwk: parsed.publicKeyJwk,
        fingerprint: parsed.fingerprint,
      };
    } catch (e) {
      console.warn('Failed to restore saved keys, regenerating fresh identity...', e);
    }
  }

  // Generate new ECDH P-256 Key Pair
  const keyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );

  const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const fingerprint = await generateFingerprint(publicKeyJwk);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ publicKeyJwk, privateKeyJwk, fingerprint })
  );

  return { keyPair, publicKeyJwk, fingerprint };
}

// Cache of derived shared symmetric keys: contactPublicKeyString -> CryptoKey
const sharedKeyCache = new Map<string, CryptoKey>();

// Derive AES-GCM 256 shared symmetric key using ECDH
export async function getDerivedSharedKey(
  myPrivateKey: CryptoKey,
  peerPublicKeyJwk: JsonWebKey
): Promise<CryptoKey> {
  const cacheKey = `${peerPublicKeyJwk.x}_${peerPublicKeyJwk.y}`;
  if (sharedKeyCache.has(cacheKey)) {
    return sharedKeyCache.get(cacheKey)!;
  }

  const peerPublicKey = await window.crypto.subtle.importKey(
    'jwk',
    peerPublicKeyJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedKey = await window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  sharedKeyCache.set(cacheKey, sharedKey);
  return sharedKey;
}

// Encrypt payload with AES-GCM
export async function encryptDirectMessage(
  plainText: string,
  myPrivateKey: CryptoKey,
  peerPublicKeyJwk: JsonWebKey
): Promise<{ ciphertext: string; iv: string }> {
  const sharedKey = await getDerivedSharedKey(myPrivateKey, peerPublicKeyJwk);
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit random IV
  const encoded = new TextEncoder().encode(plainText);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encoded
  );

  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv),
  };
}

// Decrypt payload with AES-GCM
export async function decryptDirectMessage(
  ciphertextBase64: string,
  ivBase64: string,
  myPrivateKey: CryptoKey,
  peerPublicKeyJwk: JsonWebKey
): Promise<string> {
  try {
    const sharedKey = await getDerivedSharedKey(myPrivateKey, peerPublicKeyJwk);
    const iv = base64ToBuffer(ivBase64);
    const ciphertext = base64ToBuffer(ciphertextBase64);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
      sharedKey,
      ciphertext as unknown as ArrayBuffer
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error('Decryption failed for message:', err);
    return '[Decryption failed: Key mismatch or tampered payload]';
  }
}

// Clear all local cryptographic keys
export function purgeLocalCryptoKeys(): void {
  localStorage.removeItem(STORAGE_KEY);
  sharedKeyCache.clear();
}
