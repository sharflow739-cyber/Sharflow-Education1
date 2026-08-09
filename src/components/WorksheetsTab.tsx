import React, { useState } from 'react';
import { DEFAULT_WORKSHEETS } from '../data/defaultCourses';
import { Download, FileText, CheckCircle2, ArrowLeft } from 'lucide-react';

interface WorksheetsTabProps {
  onBackToDashboard: () => void;
}

export const WorksheetsTab: React.FC<WorksheetsTabProps> = ({ onBackToDashboard }) => {
  const [downloadedMap, setDownloadedMap] = useState<Record<string, boolean>>({});

  const handleDownload = (id: string, title: string) => {
    setDownloadedMap((prev) => ({ ...prev, [id]: true }));
    // Simulate PDF file download trigger
    const element = document.createElement("a");
    const file = new Blob([`প্র্যাকটিস ওয়ার্কশিট: ${title}\nঅ্যাবাকাস পেরেন্ট ট্রেনিং প্রোগ্রাম।`], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${title}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-orange-600 bg-white border border-slate-200 hover:border-orange-200 px-3 py-2 rounded-xl transition-all shadow-2xs"
        >
          <ArrowLeft size={16} />
          ড্যাশবোর্ডে ফিরে যান
        </button>

        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
          রঙিন প্র্যাকটিস শিট সংগ্রহ
        </span>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
        <h1 className="text-2xl font-extrabold text-slate-900">
          প্র্যাকটিস ওয়ার্কশিট ও পিডিএফ উপাদান (Worksheets)
        </h1>
        <p className="text-xs text-slate-600 leading-relaxed">
          আপনার সন্তানের প্রতিদিন ১০-১৫ মিনিট প্র্যাকটিসের জন্য রঙিন ওয়ার্কশিটগুলো ডাউনলোড করে প্রিন্ট করে দিন।
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DEFAULT_WORKSHEETS.map((ws) => (
          <div
            key={ws.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-orange-300 transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
                <FileText size={20} />
              </div>

              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                {ws.file_format} • {ws.file_size}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-orange-600 uppercase">
                {ws.module_name}
              </span>
              <h3 className="font-bold text-slate-900 text-sm mt-0.5">
                {ws.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {ws.description}
              </p>
            </div>

            <button
              onClick={() => handleDownload(ws.id, ws.title)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                downloadedMap[ws.id]
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-orange-500 hover:bg-orange-600 text-white shadow-2xs'
              }`}
            >
              {downloadedMap[ws.id] ? (
                <>
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  ডাউনলোড সম্পন্ন (Downloaded)
                </>
              ) : (
                <>
                  <Download size={14} />
                  ডাউনলোড করুন (PDF Download)
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
