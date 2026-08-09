import React, { useState } from 'react';
import { DEFAULT_QUIZZES } from '../data/defaultCourses';
import { Award, ArrowLeft, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

interface QuizTabProps {
  onBackToDashboard: () => void;
}

export const QuizTab: React.FC<QuizTabProps> = ({ onBackToDashboard }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (qId: string, optIdx: number) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  const calculateScore = () => {
    let score = 0;
    DEFAULT_QUIZZES.forEach((q) => {
      if (selectedAnswers[q.id] === q.correct_index) {
        score += 1;
      }
    });
    return score;
  };

  const resetQuiz = () => {
    setSelectedAnswers({});
    setSubmitted(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-orange-600 bg-white border border-slate-200 hover:border-orange-200 px-3 py-2 rounded-xl transition-all shadow-2xs"
        >
          <ArrowLeft size={16} />
          ড্যাশবোর্ডে ফিরে যান
        </button>

        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
          <Award size={14} />
          মৌলিক ধারণা কুইজ
        </span>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
        <h1 className="text-2xl font-extrabold text-slate-900">
          অ্যাবাকাস মেধা যাচাই কুইজ (Practice Quiz)
        </h1>
        <p className="text-xs text-slate-600">
          ভিডিও ক্লাস দেখে আপনার অর্জিত জ্ঞান যাচাই করতে নিচের কুইজগুলোর সঠিক উত্তর নির্বাচন করুন:
        </p>
      </div>

      {submitted && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-2xl text-white shadow-md flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-xl">কুইজ ফলাফল (Result)</h3>
            <p className="text-xs text-emerald-100 mt-0.5">
              আপনি {DEFAULT_QUIZZES.length} টি প্রশ্নের মধ্যে {calculateScore()} টি সঠিক উত্তর দিয়েছেন।
            </p>
          </div>
          <button
            onClick={resetQuiz}
            className="px-4 py-2 bg-white text-emerald-800 font-bold text-xs rounded-xl shadow-xs hover:bg-emerald-50 flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            পুনরায় কুইজ দিন
          </button>
        </div>
      )}

      <div className="space-y-4">
        {DEFAULT_QUIZZES.map((q, qIdx) => {
          const isUserCorrect = selectedAnswers[q.id] === q.correct_index;

          return (
            <div
              key={q.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-orange-100 text-orange-800 text-[11px] font-bold rounded">
                  প্রশ্ন ০{qIdx + 1}
                </span>
                {submitted && (
                  <span>
                    {isUserCorrect ? (
                      <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 size={16} /> সঠিক উত্তর
                      </span>
                    ) : (
                      <span className="text-rose-600 text-xs font-bold flex items-center gap-1">
                        <XCircle size={16} /> ভুল উত্তর
                      </span>
                    )}
                  </span>
                )}
              </div>

              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {q.question}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {q.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[q.id] === optIdx;
                  const isCorrect = q.correct_index === optIdx;

                  let btnStyle = "bg-slate-50 border-slate-200 text-slate-700 hover:bg-orange-50 hover:border-orange-200";
                  if (isSelected) {
                    btnStyle = "bg-orange-500 border-orange-500 text-white font-bold";
                  }
                  if (submitted) {
                    if (isCorrect) {
                      btnStyle = "bg-emerald-500 border-emerald-500 text-white font-bold";
                    } else if (isSelected && !isCorrect) {
                      btnStyle = "bg-rose-500 border-rose-500 text-white font-bold";
                    } else {
                      btnStyle = "bg-slate-50 border-slate-200 text-slate-400 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelect(q.id, optIdx)}
                      className={`p-3 rounded-xl border text-xs text-left transition-all ${btnStyle}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200">
                  <strong className="text-slate-800">ব্যাখ্যা: </strong>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!submitted && (
        <button
          onClick={() => setSubmitted(true)}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
        >
          কুইজ জমা দিন (Submit Quiz)
        </button>
      )}

    </div>
  );
};
