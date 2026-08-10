import React from 'react';
import { Play, ShieldAlert } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl?: string;
  youtubeId?: string;
  title?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  youtubeId,
  title = 'কোর্স ভিডিও',
}) => {
  const rawUrl = (videoUrl || youtubeId || '').trim();

  // Helper to parse source type and get iframe or video src
  const parseVideoSource = (input: string) => {
    if (!input) {
      return { type: 'none', src: '' };
    }

    // 1. YouTube (URL or Video ID)
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
        src: `https://www.youtube-nocookie.com/embed/${cleanId}?rel=0&modestbranding=1&controls=1&iv_load_policy=3&playsinline=1&enablejsapi=1`,
      };
    }

    // 2. Google Drive Link
    if (input.includes('drive.google.com')) {
      let embedSrc = input;
      if (input.includes('/view')) {
        embedSrc = input.replace(/\/view.*/, '/preview');
      } else if (input.includes('/edit')) {
        embedSrc = input.replace(/\/edit.*/, '/preview');
      } else if (!input.endsWith('/preview')) {
        embedSrc = `${input}/preview`;
      }
      return { type: 'iframe', src: embedSrc };
    }

    // 3. TeraBox / 1024tera Link
    if (input.includes('terabox') || input.includes('1024tera') || input.includes('teraboxapp')) {
      return { type: 'iframe', src: input };
    }

    // 4. Direct Video File (.mp4, .webm, .ogg)
    if (/\.(mp4|webm|ogg)($|\?)/i.test(input)) {
      return { type: 'mp4', src: input };
    }

    // 5. Generic Iframe Embed
    return { type: 'iframe', src: input };
  };

  const parsed = parseVideoSource(rawUrl);

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-800">
      {/* Player Header */}
      <div className="bg-slate-950 px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Play size={14} className="text-orange-500 fill-orange-500" />
          <span>ইন-প্ল্যাটফর্ম কোর্স ভিডিও প্লেয়ার</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
          <ShieldAlert size={13} />
          <span>সুরক্ষিত স্ট্রিম</span>
        </div>
      </div>

      {/* Embedded Player Frame */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center">
        {parsed.type === 'iframe' && (
          <iframe
            src={parsed.src}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}

        {parsed.type === 'mp4' && (
          <video
            src={parsed.src}
            controls
            controlsList="nodownload"
            className="w-full h-full object-contain"
          >
            আপনার ব্রাউজার এই ভিডিও প্লেব্যাক সমর্থন করছে না।
          </video>
        )}

        {parsed.type === 'none' && (
          <div className="p-8 text-center space-y-2 text-slate-400">
            <p className="text-sm font-semibold text-slate-300">ভিডিও লোড হয়নি</p>
            <p className="text-xs">এডমিন এখনো এই ক্লাসের জন্য ভিডিও লিংক যুক্ত করেননি।</p>
          </div>
        )}
      </div>

      {/* REQUIRED Notice below player */}
      <div className="p-3.5 bg-slate-950/90 text-center border-t border-slate-800">
        <p className="text-xs sm:text-sm font-extrabold text-amber-300">
          “ভিডিওটি শুধুমাত্র এই কোর্স প্ল্যাটফর্মের মধ্যেই দেখুন।”
        </p>
      </div>
    </div>
  );
};
