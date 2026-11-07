import React, { useState } from 'react';
import { X, Code2, Lock, ShieldCheck, Terminal, ExternalLink, Check } from 'lucide-react';
import { ChatMessage } from '../types/chat';

interface OpenSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  lastEncryptedMessage?: ChatMessage | null;
}

export const OpenSourceModal: React.FC<OpenSourceModalProps> = ({
  isOpen,
  onClose,
  lastEncryptedMessage,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const samplePayload = lastEncryptedMessage
    ? {
        id: lastEncryptedMessage.id,
        sender: lastEncryptedMessage.sender,
        target: lastEncryptedMessage.target,
        timestamp: lastEncryptedMessage.timestamp,
        isEncrypted: true,
        encryptedPayload: lastEncryptedMessage.encryptedPayload?.slice(0, 48) + '...[REDACTED_CIPHERTEXT]',
        iv: lastEncryptedMessage.iv,
      }
    : {
        id: 'msg_98471928_sample',
        sender: 'Alice',
        target: 'Bob',
        isEncrypted: true,
        encryptedPayload: 't5E1m8K7VqW...[AES-GCM-256_CIPHERTEXT]',
        iv: 'bF8qL2vP0xZ9aM==',
      };

  const handleCopySpec = () => {
    navigator.clipboard.writeText(
      JSON.stringify(
        {
          project: 'Nexus Chat',
          license: 'MIT / Apache-2.0',
          encryption: 'Web Crypto API (SubtleCrypto)',
          keyExchange: 'ECDH P-256',
          cipher: 'AES-GCM-256',
          relay: 'Zero-Knowledge Relay Server',
        },
        null,
        2
      )
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] text-slate-900 dark:text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Open Source Transparency &amp; Audit</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verifiable Zero-Knowledge Cryptography Architecture
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Key pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold text-xs">
                <Lock className="w-3.5 h-3.5" />
                ECDH P-256
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Elliptic Curve Diffie-Hellman key exchange directly in user browser.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                AES-GCM-256
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authenticated symmetric encryption with unique 12-byte random IVs.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
              <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold text-xs">
                <Terminal className="w-3.5 h-3.5" />
                Zero-Knowledge
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Server cannot inspect or tamper with personal contact messages.
              </p>
            </div>
          </div>

          {/* Live Packet Inspector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-blue-500" />
                Live Wire Packet Relay Inspector
              </span>
              <button
                onClick={handleCopySpec}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3" /> : null}
                {copied ? 'Copied Specs' : 'Copy Specs'}
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
              {JSON.stringify(samplePayload, null, 2)}
            </pre>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Notice: The server relays only the high-entropy <code className="text-blue-500">encryptedPayload</code> and random initialization vector. Plaintext content is never visible in server transit.
            </p>
          </div>

          {/* Community transparency declaration */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Transparency &amp; Open Source Commitment
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Nexus is engineered for complete algorithmic transparency. Every cryptographic primitive relies exclusively on the W3C Web Cryptography standard without proprietary obfuscation or hidden telemetry.
            </p>
            <div className="pt-1 flex items-center gap-4 text-xs font-medium text-blue-600 dark:text-blue-400">
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                License: <strong>MIT / Apache 2.0</strong>
              </span>
              <span className="flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                Community Audited
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
          >
            Close Audit Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
