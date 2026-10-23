import React from 'react';
import { useSettings } from '../contexts/SettingsContext';

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
}) => {
  const { settings } = useSettings();

  const driveHideHeader = propDriveHideHeader ?? settings.drive_hide_header ?? true;
  const driveHeaderOffset = propDriveHeaderOffset ?? settings.drive_header_offset ?? 52;
  const blockPopoutOverlay = propBlockPopoutOverlay ?? settings.block_popout_overlay ?? true;
  const watermarkEnabled = settings.watermark_enabled ?? false;
  const watermarkMode = settings.watermark_mode ?? 'email';

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

  // Watermark text determination
  let watermarkText = '';
  if (watermarkEnabled) {
    if (watermarkMode === 'email' && viewerEmail) {
      watermarkText = viewerEmail;
    } else if (watermarkMode === 'phone' && viewerPhone) {
      watermarkText = viewerPhone;
    } else if (watermarkMode === 'both') {
      watermarkText = [viewerEmail, viewerPhone].filter(Boolean).join(' • ');
    } else if (viewerEmail) {
      watermarkText = viewerEmail;
    }
  }

  const offsetPx = Math.max(0, Math.min(80, driveHeaderOffset));
  const shouldOffset = parsed.isGoogleDrive && driveHideHeader && offsetPx > 0;

  return (
    <div
      className="relative w-full max-w-full mx-auto aspect-video rounded-2xl overflow-hidden bg-black shadow-md border border-slate-800 select-none"
      style={{
        aspectRatio: '16 / 9',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Embedded Iframe Player */}
      {parsed.type === 'iframe' && (
        <iframe
          src={parsed.src}
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
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          sandbox={
            parsed.isGoogleDrive
              ? 'allow-scripts allow-same-origin allow-forms allow-presentation'
              : undefined
          }
        />
      )}

      {/* Transparent Pop-out Blocker Overlay (Drive Only) */}
      {parsed.isGoogleDrive && blockPopoutOverlay && (
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

      {/* Floating Watermark Overlay */}
      {watermarkEnabled && watermarkText && (
        <div
          className="absolute z-20 pointer-events-none select-none text-[11px] sm:text-xs font-mono font-medium tracking-wider text-white/40 drop-shadow-md animate-watermark-drift"
          style={{ pointerEvents: 'none' }}
        >
          {watermarkText}
        </div>
      )}

      {/* Direct Video File Player (MP4 / WebM / OGG) */}
      {parsed.type === 'mp4' && (
        <video
          src={parsed.src}
          controls
          controlsList="nodownload"
          className="absolute inset-0 w-full h-full object-contain"
        >
          আপনার ব্রাউজার এই ভিডিও প্লেব্যাক সমর্থন করছে না।
        </video>
      )}

      {/* Empty State */}
      {parsed.type === 'none' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-1">
          <p className="text-sm font-semibold text-slate-300">ভিডিও লোড হয়নি</p>
          <p className="text-xs text-slate-500">এই ক্লাসের জন্য এখনো ভিডিও লিংক যুক্ত করা হয়নি।</p>
        </div>
      )}
    </div>
  );
};
