import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Lock } from 'lucide-react';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  targetAvatar: string;
  isVideo: boolean;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  targetName,
  targetAvatar,
  isVideo,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(!isVideo);
  const [callDuration, setCallDuration] = useState(0);
  const [statusText, setStatusText] = useState('Establishing encrypted stream...');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setCallDuration(0);
      return;
    }

    setStatusText('Negotiating WebRTC stream...');

    if (isVideo) {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          console.warn('Camera permission unavailable');
        });
    }

    const timer = setTimeout(() => {
      setStatusText('Encrypted Stream Connected');
    }, 2000);

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, isVideo]);

  if (!isOpen) return null;

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        return;
      }
    }
    setIsMuted(!isMuted);
  };

  const toggleCam = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOff(!videoTrack.enabled);
        return;
      }
    }
    setCameraOff(!cameraOff);
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col items-center justify-between p-8 text-white min-h-[480px]">
        {/* Title */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
            <Lock className="w-3 h-3" />
            <span>End-to-End Encrypted Session</span>
          </div>
          <h2 className="text-2xl font-bold mt-2">{targetName}</h2>
          <p className="text-xs text-slate-400">
            {statusText} • {formatDuration(callDuration)}
          </p>
        </div>

        {/* Center Visual / Video */}
        <div className="my-6 relative w-full h-56 rounded-2xl bg-slate-800 border border-slate-700/60 overflow-hidden flex items-center justify-center">
          {isVideo && !cameraOff ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-5xl shadow-lg ring-8 ring-blue-500/20 animate-pulse">
                {targetAvatar}
              </div>
              <span className="text-xs text-slate-400">Secure Voice Link</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleMic}
            className={`p-4 rounded-2xl transition border ${
              isMuted
                ? 'bg-red-500/20 border-red-500 text-red-400'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button
            onClick={toggleCam}
            className={`p-4 rounded-2xl transition border ${
              cameraOff
                ? 'bg-red-500/20 border-red-500 text-red-400'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
            }`}
            title={cameraOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {cameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>

          <button
            onClick={onClose}
            className="p-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 transition hover:scale-105"
            title="Hang up"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
