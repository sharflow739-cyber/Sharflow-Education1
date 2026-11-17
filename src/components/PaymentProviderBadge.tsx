import React from 'react';
import { PaymentProvider } from '../lib/manualPayments';

interface PaymentProviderLogoProps {
  provider: PaymentProvider;
  size?: 'sm' | 'md' | 'lg';
}

export const PaymentProviderLogo: React.FC<PaymentProviderLogoProps> = ({
  provider,
  size = 'md',
}) => {
  const iconDims =
    size === 'lg' ? 'w-11 h-11 rounded-xl' : size === 'sm' ? 'w-6 h-6 rounded-md' : 'w-8 h-8 rounded-lg';
  const titleSize =
    size === 'lg' ? 'text-base sm:text-lg' : size === 'sm' ? 'text-xs' : 'text-sm';

  if (provider === 'bkash') {
    return (
      <span className="inline-flex items-center gap-2.5 min-w-0">
        <span
          className={`${iconDims} bg-[#E2136E] text-white flex items-center justify-center shrink-0 shadow-xs`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 32 32" className="w-[70%] h-[70%]" fill="none">
            <path
              d="M6 7.5L17.5 14.2L26.5 9.5L21 20.5L13.5 16.5L6 7.5Z"
              fill="currentColor"
            />
            <path
              d="M13.5 16.5L21 20.5L15.2 26.5L13.5 16.5Z"
              fill="#FFE4F0"
            />
            <path
              d="M21 20.5L26.5 9.5L24.5 23.5L21 20.5Z"
              fill="#FBCFE8"
            />
          </svg>
        </span>
        <span className="min-w-0 leading-tight">
          <span className={`${titleSize} font-black text-[#B80D58] block`}>
            বিকাশ <span className="font-bold text-slate-500 text-xs">(bKash)</span>
          </span>
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2.5 min-w-0">
      <span
        className={`${iconDims} bg-gradient-to-br from-[#F7941D] to-[#ED1C24] text-white flex items-center justify-center shrink-0 shadow-xs`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 32 32" className="w-[70%] h-[70%]" fill="none">
          <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="2.4" />
          <path
            d="M11.5 21V11L20.5 21V11"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="min-w-0 leading-tight">
        <span className={`${titleSize} font-black text-[#C93310] block`}>
          নগদ <span className="font-bold text-slate-500 text-xs">(Nagad)</span>
        </span>
      </span>
    </span>
  );
};
