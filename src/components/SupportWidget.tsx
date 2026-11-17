import React, { useEffect, useRef, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { HelpCircle, Mail, MessageCircle, MessagesSquare, X, ExternalLink } from 'lucide-react';

export const SUPPORT_WHATSAPP_URL = 'https://wa.me/8801352024231';
export const SUPPORT_MESSENGER_URL = 'https://m.me/61579793452510';

interface SupportWidgetProps {
  showMobileBottomNav?: boolean;
  isHidden?: boolean;
  activePath?: string;
}

export const SupportWidget: React.FC<SupportWidgetProps> = ({
  showMobileBottomNav = false,
  isHidden = false,
  activePath = '/',
}) => {
  const { settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const supportEmail = (settings.contact_email || '').trim();

  // Close popover if auth/recovery modal opens or route changes
  useEffect(() => {
    if (isHidden) {
      setIsOpen(false);
    }
  }, [isHidden]);

  useEffect(() => {
    setIsOpen(false);
  }, [activePath]);

  // Close on Escape key or outside pointer click
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  if (isHidden) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`fixed right-3 sm:right-5 z-30 flex flex-col items-end gap-2.5 ${
        showMobileBottomNav
          ? 'bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6'
          : 'bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:bottom-6'
      }`}
    >
      {isOpen && (
        <div
          id="site-support-panel"
          role="dialog"
          aria-label="সহায়তা যোগাযোগ মাধ্যম"
          className="w-[min(19rem,calc(100vw-1.5rem))] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
        >
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold leading-tight">সহায়তা</h2>
              <p className="text-[11px] text-slate-300 mt-0.5">
                কোর্স বা অ্যাকাউন্ট বিষয়ে যোগাযোগ করুন
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="সহায়তা বক্স বন্ধ করুন"
              className="min-h-[36px] min-w-[36px] rounded-xl text-slate-300 hover:text-white hover:bg-white/10 inline-flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              <X size={17} />
            </button>
          </div>

          <div className="p-3 space-y-2">
            <a
              href={SUPPORT_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="w-full min-h-[46px] px-3 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-between gap-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <MessageCircle size={17} />
                </span>
                <div className="min-w-0">
                  <span className="block text-xs font-extrabold text-slate-900">WhatsApp</span>
                  <span className="block text-[11px] text-slate-600 truncate">সরাসরি মেসেজ পাঠান</span>
                </div>
              </div>
              <ExternalLink size={14} className="text-emerald-700 shrink-0" />
            </a>

            <a
              href={SUPPORT_MESSENGER_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="w-full min-h-[46px] px-3 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 flex items-center justify-between gap-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
                  <MessagesSquare size={17} />
                </span>
                <div className="min-w-0">
                  <span className="block text-xs font-extrabold text-slate-900">Messenger</span>
                  <span className="block text-[11px] text-slate-600 truncate">মেসেঞ্জারে বার্তা দিন</span>
                </div>
              </div>
              <ExternalLink size={14} className="text-sky-700 shrink-0" />
            </a>

            {supportEmail && (
              <a
                href={`mailto:${supportEmail}`}
                onClick={() => setIsOpen(false)}
                className="w-full min-h-[46px] px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <span className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
                  <Mail size={16} />
                </span>
                <div className="min-w-0">
                  <span className="block text-xs font-extrabold text-slate-900">সাপোর্ট ইমেইল</span>
                  <span className="block text-[11px] text-slate-600 break-all">{supportEmail}</span>
                </div>
              </a>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="site-support-panel"
        aria-label="সাহায্য"
        className="min-h-[44px] px-4 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white border border-slate-700/80 shadow-lg shadow-slate-900/20 inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
      >
        <HelpCircle size={18} className="text-orange-400 shrink-0" />
        <span>সাহায্য</span>
      </button>
    </div>
  );
};
