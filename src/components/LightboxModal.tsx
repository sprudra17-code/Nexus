import React from 'react';
import { X, Download } from 'lucide-react';

interface LightboxModalProps {
  src: string | null;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({ src, onClose }) => {
  if (!src) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <a
          href={src}
          download="nexus-image.png"
          onClick={(e) => e.stopPropagation()}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          title="Download Image"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          title="Close viewer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <img
        src={src}
        alt="Enlarged preview"
        onClick={(e) => e.stopPropagation()}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
      />
    </div>
  );
};
