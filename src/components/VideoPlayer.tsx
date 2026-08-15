import React from 'react';

interface VideoPlayerProps {
  videoUrl?: string;
  youtubeId?: string;
  title?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  youtubeId,
  title = 'Course Video',
}) => {
  const rawUrl = (videoUrl || youtubeId || '').trim();

  /**
   * Helper to parse video source and return proper player configuration.
   * 
   * ROOT CAUSE & MOBILE DISPLAY FIX:
   * Google Drive `/preview` iframes include a ~52px top header bar (file name, popout button).
   * Inside a compact 16:9 mobile player (e.g. 360px wide = ~202px tall), that 52px top header bar
   * consumes roughly 25-30% of the entire player height and forces the video to render only in the lower half.
   * 
   * By shifting Google Drive iframes up by 52px (top: -52px; height: calc(100% + 52px)) within an
   * overflow:hidden container:
   * 1. The top empty header / popout icon is shifted outside the visible view.
   * 2. The actual video content expands upward to occupy the entire full screen/container.
   * 3. The bottom controls (timeline, play, volume, fullscreen) remain perfectly accessible at the bottom (0px offset).
   */
  const parseVideoSource = (input: string) => {
    if (!input) {
      return { type: 'none', src: '', isGoogleDrive: false };
    }

    // 1. Google Drive Links (Video file preview)
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

  return (
    /* 
      Responsive Video Wrapper:
      - 16:9 aspect ratio across mobile (320px-430px), tablet, and desktop viewports.
      - Relative positioning and overflow hidden to cleanly clip and center the video stream.
    */
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
      {/* 
        Embedded Iframe (Google Drive / YouTube / Embeds):
        - For Google Drive: shifted top: -52px, height: calc(100% + 52px) so the video fills the full container and eliminates the top black void.
        - For other embeds: top: 0, height: 100%.
      */}
      {parsed.type === 'iframe' && (
        <iframe
          src={parsed.src}
          title={title}
          className="absolute inset-x-0 w-full border-0 block"
          style={{
            position: 'absolute',
            top: parsed.isGoogleDrive ? '-52px' : 0,
            left: 0,
            width: '100%',
            height: parsed.isGoogleDrive ? 'calc(100% + 52px)' : '100%',
            border: 0,
            margin: 0,
            padding: 0,
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          sandbox={
            parsed.isGoogleDrive
              ? 'allow-scripts allow-same-origin allow-forms allow-presentation'
              : undefined
          }
        />
      )}

      {/* 
        Google Drive Pop-Out / External Icon Blocker:
        Fallback blocker overlay over the top-right area
      */}
      {parsed.isGoogleDrive && (
        <div
          className="absolute top-0 right-0 w-14 sm:w-16 h-10 sm:h-12 z-20 cursor-default bg-transparent pointer-events-auto"
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
