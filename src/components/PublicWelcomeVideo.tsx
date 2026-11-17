import React, { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';

interface PublicWelcomeVideoProps {
  src: string;
}

type MediaStatus = 'loading' | 'ready' | 'unavailable';

export const PublicWelcomeVideo: React.FC<PublicWelcomeVideoProps> = ({ src }) => {
  const cleanSrc = src.trim();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [mediaStatus, setMediaStatus] = useState<MediaStatus>(() =>
    cleanSrc ? 'loading' : 'unavailable'
  );
  const [autoplayBlocked, setAutoplayBlocked] = useState<boolean>(false);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Reset availability and autoplay state when source URL changes
  useEffect(() => {
    setMediaStatus(cleanSrc ? 'loading' : 'unavailable');
    setAutoplayBlocked(false);
  }, [cleanSrc]);

  // Respect OS/browser prefers-reduced-motion preference dynamically
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      if (e.matches && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      if (e.matches) {
        setAutoplayBlocked(false);
      }
    };

    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Attempt UNMUTED autoplay on load (no silent autoplay fallback); surface play button if browser rejects
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || mediaStatus !== 'ready') return;

    if (prefersReducedMotion) {
      if (!vid.paused) {
        vid.pause();
      }
      setAutoplayBlocked(false);
      return;
    }

    vid.defaultMuted = false;
    vid.muted = false;

    const playPromise = vid.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          setAutoplayBlocked(false);
        })
        .catch(() => {
          if (!vid.paused) {
            vid.pause();
          }
          vid.muted = false;
          setAutoplayBlocked(true);
        });
    } else if (vid.paused) {
      setAutoplayBlocked(true);
    }
  }, [mediaStatus, prefersReducedMotion, cleanSrc]);

  const handlePlayWithSound = () => {
    const vid = videoRef.current;
    if (!vid) return;

    vid.defaultMuted = false;
    vid.muted = false;
    if (vid.volume === 0) {
      vid.volume = 1;
    }

    vid
      .play()
      .then(() => {
        setAutoplayBlocked(false);
      })
      .catch(() => {
        setAutoplayBlocked(true);
      });
  };

  if (!cleanSrc || mediaStatus === 'unavailable') {
    return null;
  }

  const isReady = mediaStatus === 'ready';

  return (
    <div
      aria-hidden={!isReady}
      className={
        isReady
          ? 'max-w-3xl mx-auto rounded-2xl sm:rounded-3xl overflow-hidden bg-[#111214] border border-[#D4AF5F]/35 shadow-2xl'
          : '!m-0 absolute -z-10 w-px h-px overflow-hidden opacity-0 pointer-events-none'
      }
    >
      <div className="relative aspect-video w-full bg-black">
        <video
          key={cleanSrc}
          ref={videoRef}
          src={cleanSrc}
          controls={isReady}
          autoPlay={isReady && !prefersReducedMotion}
          playsInline
          preload="metadata"
          onLoadedMetadata={() => {
            const vid = videoRef.current;
            if (vid && vid.videoWidth > 0 && vid.videoHeight > 0) {
              setMediaStatus('ready');
            } else {
              // Reject audio-only/empty responses gracefully
              setMediaStatus('unavailable');
            }
          }}
          onCanPlay={() => {
            const vid = videoRef.current;
            if (vid && vid.videoWidth > 0 && vid.videoHeight > 0) {
              setMediaStatus('ready');
            }
          }}
          onPlay={() => {
            setAutoplayBlocked(false);
          }}
          onError={() => {
            setMediaStatus('unavailable');
          }}
          className="w-full h-full object-contain"
        />
      </div>

      {isReady && autoplayBlocked && !prefersReducedMotion && (
        <div className="p-3 sm:p-4 bg-[#1B1C20] border-t border-[#D4AF5F]/25 flex items-center justify-center">
          <button
            type="button"
            onClick={handlePlayWithSound}
            className="w-full sm:w-auto min-h-[48px] px-6 py-3 bg-gradient-to-r from-[#E4BE67] to-[#CFA242] hover:from-[#ECC978] hover:to-[#DBB052] active:from-[#C79A3B] active:to-[#B8892B] text-[#141517] font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-[#D4AF5F]/20 inline-flex items-center justify-center gap-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4D992] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1C20]"
          >
            <Volume2 size={20} className="shrink-0" />
            <span>সাউন্ডসহ ভিডিও চালান</span>
          </button>
        </div>
      )}
    </div>
  );
};
