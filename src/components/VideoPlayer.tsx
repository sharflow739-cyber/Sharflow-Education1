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

  // Helper to parse source type and get iframe or video src
  const parseVideoSource = (input: string) => {
    if (!input) {
      return { type: 'none', src: '', isGoogleDrive: false };
    }

    // 1. Google Drive Link
    if (input.includes('drive.google.com')) {
      let embedSrc = input;
      // Extract Google Drive File ID if present
      const idMatch = input.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
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

    // 3. Direct Video File (.mp4, .webm, .ogg)
    if (/\.(mp4|webm|ogg)($|\?)/i.test(input)) {
      return { type: 'mp4', src: input, isGoogleDrive: false };
    }

    // 4. Other Iframe Embeds (e.g. TeraBox, Vimeo, etc.)
    return { type: 'iframe', src: input, isGoogleDrive: false };
  };

  const parsed = parseVideoSource(rawUrl);

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-md border border-slate-800">
      {/* Embedded Iframe Player (100% width and height, 16:9 aspect ratio) */}
      {parsed.type === 'iframe' && (
        <iframe
          src={parsed.src}
          title={title}
          className="absolute top-0 left-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      )}

      {/* 
        Google Drive Corner Mask:
        Google Drive embed iframes generate a "Pop-out / Open in new window" icon in the top-right corner.
        Because of cross-origin browser security restrictions, the DOM inside the third-party iframe cannot be modified directly.
        This responsive UI overlay intercepts pointer clicks specifically over the top-right button area
        to prevent external navigation without covering the video playback controls, center play button, or timeline.
      */}
      {parsed.isGoogleDrive && (
        <div
          className="absolute top-0 right-0 w-16 h-14 z-20 cursor-default bg-transparent"
          aria-hidden="true"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      )}

      {/* Direct Video Player */}
      {parsed.type === 'mp4' && (
        <video
          src={parsed.src}
          controls
          controlsList="nodownload"
          className="absolute top-0 left-0 w-full h-full object-contain"
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
