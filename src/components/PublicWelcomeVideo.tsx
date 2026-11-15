import React, { useEffect, useRef, useState } from 'react';

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

  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Reset availability state when source URL changes
  useEffect(() => {
    setMediaStatus(cleanSrc ? 'loading' : 'unavailable');
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
    };

    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Trigger muted autoplay cleanly when media is ready and reduced motion is off
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || mediaStatus !== 'ready') return;

    if (prefersReducedMotion) {
      if (!vid.paused) {
        vid.pause();
      }
      return;
    }

    vid.defaultMuted = true;
    vid.muted = true;
    vid.play().catch(() => {
      // Browser autoplay policy blocked; native controls allow manual playback
    });
  }, [mediaStatus, prefersReducedMotion, cleanSrc]);

  if (!cleanSrc || mediaStatus === 'unavailable') {
    return null;
  }

  const isReady = mediaStatus === 'ready';

  return (
    <div
      aria-hidden={!isReady}
      className={
        isReady
          ? 'mt-6 max-w-3xl mx-auto rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl'
          : 'absolute w-px h-px overflow-hidden opacity-0 pointer-events-none'
      }
    >
      <div className="relative aspect-video w-full bg-black">
        <video
          key={cleanSrc}
          ref={videoRef}
          src={cleanSrc}
          controls={isReady}
          autoPlay={!prefersReducedMotion}
          muted
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
          onError={() => {
            setMediaStatus('unavailable');
          }}
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
};
