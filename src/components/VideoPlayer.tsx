import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Maximize, Minimize, ShieldAlert, AlertCircle, RefreshCw } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl?: string;
  youtubeId?: string;
  title?: string;
  viewerEmail?: string;
  viewerPhone?: string;
  // Optional direct overrides
  driveHideHeader?: boolean;
  driveHeaderOffset?: number;
  blockPopoutOverlay?: boolean;
  watermarkEnabled?: boolean;
  watermarkMode?: 'email' | 'phone' | 'both';
  watermarkOpacity?: number;
  watermarkIntervalSeconds?: number;
  isLivePreview?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  youtubeId,
  title = 'Course Video',
  viewerEmail,
  viewerPhone,
  driveHideHeader: propDriveHideHeader,
  driveHeaderOffset: propDriveHeaderOffset,
  blockPopoutOverlay: propBlockPopoutOverlay,
  watermarkEnabled: propWatermarkEnabled,
  watermarkMode: propWatermarkMode,
  watermarkOpacity: propWatermarkOpacity,
  watermarkIntervalSeconds: propWatermarkIntervalSeconds,
  isLivePreview = false,
}) => {
  const { settings } = useSettings();

  const driveHideHeader = propDriveHideHeader ?? settings.drive_hide_header ?? true;
  const driveHeaderOffset = propDriveHeaderOffset ?? settings.drive_header_offset ?? 52;
  const blockPopoutOverlay = propBlockPopoutOverlay ?? settings.block_popout_overlay ?? true;
  
  // Watermark configurations
  const watermarkEnabled = propWatermarkEnabled ?? settings.watermark_enabled ?? true;
  const watermarkMode = propWatermarkMode ?? settings.watermark_mode ?? 'email';
  const watermarkOpacityPercent = Math.max(10, Math.min(60, propWatermarkOpacity ?? settings.watermark_opacity ?? 30));
  const watermarkIntervalSec = Math.max(5, Math.min(60, propWatermarkIntervalSeconds ?? settings.watermark_interval_seconds ?? 15));

  const wrapperRef = useRef<HTMLDivElement>(null);
  const watermarkLayerRef = useRef<HTMLDivElement>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);

  // Tamper detection state
  const [isTampered, setIsTampered] = useState(false);

  // Random positions for the dual watermarks
  // Keep >= 8% away from left/right/top, and >= 14% away from bottom (Y <= 78%)
  const [pos1, setPos1] = useState({ x: 12, y: 18 });
  const [pos2, setPos2] = useState({ x: 55, y: 58 });

  const moveWatermarks = useCallback(() => {
    // Random position within safe area:
    // X: between 8% and 62%
    // Y: between 8% and 74%
    const newX1 = 8 + Math.floor(Math.random() * 54);
    const newY1 = 8 + Math.floor(Math.random() * 66);

    // Keep second mark somewhat separated
    const newX2 = ((newX1 + 35) % 55) + 8;
    const newY2 = ((newY1 + 38) % 66) + 8;

    setPos1({ x: newX1, y: newY1 });
    setPos2({ x: newX2, y: newY2 });
  }, []);

  // Interval timer to jump watermark position with fade transition
  useEffect(() => {
    if (!watermarkEnabled) return;
    moveWatermarks();
    const timer = setInterval(() => {
      moveWatermarks();
    }, watermarkIntervalSec * 1000);
    return () => clearInterval(timer);
  }, [watermarkEnabled, watermarkIntervalSec, moveWatermarks]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFs);
      if (!isFs) {
        setIsPseudoFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const elem = wrapperRef.current;
    if (!elem) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ((document as any).webkitExitFullscreen) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document as any).webkitExitFullscreen();
      }
      setIsFullscreen(false);
      setIsPseudoFullscreen(false);
      return;
    }

    if (isPseudoFullscreen) {
      setIsPseudoFullscreen(false);
      return;
    }

    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {
        // Fallback to CSS pseudo-fullscreen for devices that reject div.requestFullscreen
        setIsPseudoFullscreen(true);
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } else if ((elem as any).webkitRequestFullscreen) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (elem as any).webkitRequestFullscreen();
    } else {
      // CSS pseudo fullscreen fallback for iOS Safari
      setIsPseudoFullscreen(true);
    }
  };

  // Watermark text determination
  let watermarkText = '';
  const effectiveEmail = viewerEmail || (isLivePreview ? 'parent@example.com' : '');
  const effectivePhone = viewerPhone || (isLivePreview ? '01712345678' : '');

  if (watermarkEnabled) {
    if (watermarkMode === 'email' && effectiveEmail) {
      watermarkText = effectiveEmail;
    } else if (watermarkMode === 'phone' && effectivePhone) {
      watermarkText = effectivePhone;
    } else if (watermarkMode === 'both') {
      watermarkText = [effectiveEmail, effectivePhone].filter(Boolean).join(' • ');
    } else {
      watermarkText = effectiveEmail || effectivePhone || '';
    }
  }

  // Tamper deterrent: MutationObserver & Heartbeat check
  useEffect(() => {
    if (!watermarkEnabled || !watermarkText || isLivePreview) return;

    const checkTampering = () => {
      const wrapper = wrapperRef.current;
      const layer = watermarkLayerRef.current;
      if (!wrapper || !layer) {
        setIsTampered(true);
        return;
      }

      if (!wrapper.contains(layer)) {
        setIsTampered(true);
        return;
      }

      const style = window.getComputedStyle(layer);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        parseFloat(style.opacity) <= 0.02
      ) {
        setIsTampered(true);
        return;
      }
    };

    // 1. Mutation Observer
    const observer = new MutationObserver(() => {
      checkTampering();
    });

    if (wrapperRef.current) {
      observer.observe(wrapperRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'hidden'],
      });
    }

    // 2. Heartbeat interval check every 2 seconds
    const heartbeat = setInterval(checkTampering, 2000);

    return () => {
      observer.disconnect();
      clearInterval(heartbeat);
    };
  }, [watermarkEnabled, watermarkText, isLivePreview]);

  const rawUrl = (videoUrl || youtubeId || '').trim();

  const parseVideoSource = (input: string) => {
    if (!input) {
      return { type: 'none', src: '', isGoogleDrive: false };
    }

    // 1. Google Drive Links
    if (input.includes('drive.google.com')) {
      let embedSrc = input;
      const idMatch =
        input.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
        input.match(/[?&]id=([a-zA-Z0-9_-]+)/);

      if (idMatch && idMatch[1]) {
        embedSrc = `https://drive.google.com/file/d/${idMatch[1]}/preview`;
      } else {
        if (input.includes('/view')) {
          embedSrc = input.replace(/\/view.*/, '/preview');
        } else if (input.includes('/edit')) {
          embedSrc = input.replace(/\/edit.*/, '/preview');
        } else if (!input.endsWith('/preview')) {
          embedSrc = `${input}/preview`;
        }
      }
      return { type: 'iframe', src: embedSrc, isGoogleDrive: true };
    }

    // 2. YouTube (URL or Video ID)
    if (
      input.includes('youtube.com') ||
      input.includes('youtu.be') ||
      (!input.includes('://') && input.length >= 8 && input.length <= 15)
    ) {
      let cleanId = input;
      if (input.includes('v=')) {
        cleanId = input.split('v=')[1]?.split('&')[0] || input;
      } else if (input.includes('youtu.be/')) {
        cleanId = input.split('youtu.be/')[1]?.split('?')[0] || input;
      } else if (input.includes('embed/')) {
        cleanId = input.split('embed/')[1]?.split('?')[0] || input;
      }
      return {
        type: 'iframe',
        src: `https://www.youtube-nocookie.com/embed/${cleanId}?rel=0&modestbranding=1&controls=1&iv_load_policy=3&playsinline=1`,
        isGoogleDrive: false,
      };
    }

    // 3. Direct HTML5 Video File (.mp4, .webm, .ogg)
    if (/\.(mp4|webm|ogg)($|\?)/i.test(input)) {
      return { type: 'mp4', src: input, isGoogleDrive: false };
    }

    // 4. Other Iframe Embeds
    return { type: 'iframe', src: input, isGoogleDrive: false };
  };

  const parsed = parseVideoSource(rawUrl);

  const offsetPx = Math.max(0, Math.min(80, driveHeaderOffset));
  const shouldOffset = parsed.isGoogleDrive && driveHideHeader && offsetPx > 0;

  // Video source to render (blanked if tampered)
  const safeSrc = isTampered ? '' : parsed.src;

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full max-w-full mx-auto aspect-video overflow-hidden bg-black shadow-md border border-slate-800 select-none ${
        isPseudoFullscreen
          ? 'fixed inset-0 z-50 w-screen h-[100dvh] rounded-none'
          : 'rounded-2xl'
      }`}
      style={{
        aspectRatio: isPseudoFullscreen ? 'auto' : '16 / 9',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Tamper Warning Overlay */}
      {isTampered && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center text-rose-500">
          <ShieldAlert size={48} className="mb-3 text-rose-500 animate-bounce" />
          <h4 className="text-base font-extrabold text-white mb-2">
            ওয়াটারমার্ক অপসারণের চেষ্টা শনাক্ত হয়েছে।
          </h4>
          <p className="text-xs text-rose-300 max-w-sm mb-5 leading-relaxed font-medium">
            নিরাপত্তা সুরক্ষার অংশ হিসেবে ভিডিও প্লেব্যাক স্থগিত করা হয়েছে। পেজ রিফ্রেশ করুন।
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>পেজ রিফ্রেশ করুন</span>
          </button>
        </div>
      )}

      {/* Embedded Iframe Player (Drive, YouTube, Embed) */}
      {/* NOTE: allowFullScreen is removed from iframe to ensure custom wrapper fullscreen covers overlays */}
      {!isTampered && parsed.type === 'iframe' && (
        <iframe
          src={safeSrc}
          title={title}
          loading="eager"
          className="absolute inset-x-0 w-full border-0 block"
          style={{
            position: 'absolute',
            top: shouldOffset ? `-${offsetPx}px` : '0',
            left: 0,
            width: '100%',
            height: shouldOffset ? `calc(100% + ${offsetPx}px)` : '100%',
            border: 0,
            margin: 0,
            padding: 0,
          }}
          allow="autoplay; encrypted-media; picture-in-picture"
          sandbox={
            parsed.isGoogleDrive
              ? 'allow-scripts allow-same-origin allow-forms allow-presentation'
              : undefined
          }
        />
      )}

      {/* Transparent Pop-out Blocker Overlay (Drive Only) */}
      {!isTampered && parsed.isGoogleDrive && blockPopoutOverlay && (
        <div
          className="absolute top-0 right-0 w-16 h-14 z-20 cursor-default bg-transparent pointer-events-auto"
          aria-hidden="true"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      )}

      {/* Visible, Tamper-Resistant Moving Watermark Layer */}
      {watermarkEnabled && watermarkText && (
        <div
          ref={watermarkLayerRef}
          className="absolute inset-0 z-30 pointer-events-none select-none overflow-hidden"
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          {/* Mark 1: Primary floating mark */}
          <div
            className="absolute font-mono font-bold tracking-wider text-white whitespace-nowrap transition-all duration-700 ease-in-out text-[12px] sm:text-[13px]"
            style={{
              left: `${pos1.x}%`,
              top: `${pos1.y}%`,
              opacity: watermarkOpacityPercent / 100,
              textShadow: '0 0 3px #000, 0 0 6px #000, 0 1px 2px #000',
              pointerEvents: 'none',
              transform: 'translate3d(0, 0, 0)',
            }}
          >
            {watermarkText}
          </div>

          {/* Mark 2: Secondary copy at another screen spot */}
          <div
            className="absolute font-mono font-semibold tracking-wider text-white whitespace-nowrap transition-all duration-700 ease-in-out text-[11px] sm:text-[12px]"
            style={{
              left: `${pos2.x}%`,
              top: `${pos2.y}%`,
              opacity: (watermarkOpacityPercent * 0.85) / 100,
              textShadow: '0 0 3px #000, 0 0 6px #000, 0 1px 2px #000',
              pointerEvents: 'none',
              transform: 'translate3d(0, 0, 0)',
            }}
          >
            {watermarkText}
          </div>
        </div>
      )}

      {/* Direct Video File Player (MP4 / WebM / OGG) */}
      {!isTampered && parsed.type === 'mp4' && (
        <video
          src={safeSrc}
          controls
          controlsList="nodownload"
          className="absolute inset-0 w-full h-full object-contain"
        >
          আপনার ব্রাউজার এই ভিডিও প্লেব্যাক সমর্থন করছে না।
        </video>
      )}

      {/* Empty State */}
      {!isTampered && parsed.type === 'none' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-1">
          <p className="text-sm font-semibold text-slate-300">ভিডিও লোড হয়নি</p>
          <p className="text-xs text-slate-500">এই ক্লাসের জন্য এখনো ভিডিও লিংক যুক্ত করা হয়নি।</p>
        </div>
      )}

      {/* Custom Fullscreen Toggle Button on Wrapper */}
      <div className="absolute bottom-3 right-3 z-35 flex items-center gap-2">
        {isPseudoFullscreen && (
          <button
            onClick={() => setIsPseudoFullscreen(false)}
            className="p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white backdrop-blur-xs border border-white/20 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-lg"
          >
            <Minimize size={14} />
            <span>ফুলস্ক্রিন বন্ধ</span>
          </button>
        )}

        <button
          onClick={toggleFullscreen}
          title={isFullscreen || isPseudoFullscreen ? 'ছোট পর্দা (Exit Fullscreen)' : 'ফুলস্ক্রিন (Fullscreen)'}
          className="p-2 rounded-xl bg-black/70 hover:bg-black/90 text-white backdrop-blur-xs border border-white/20 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-lg"
        >
          {isFullscreen || isPseudoFullscreen ? (
            <>
              <Minimize size={14} />
              <span className="hidden sm:inline">ছোট পর্দা</span>
            </>
          ) : (
            <>
              <Maximize size={14} />
              <span className="hidden sm:inline">ফুলস্ক্রিন</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
