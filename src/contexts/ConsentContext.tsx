import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  MarketingConsentStatus,
  getMarketingConsent,
  setMarketingConsent,
} from '../lib/metaPixel';

interface ConsentContextValue {
  marketingConsent: MarketingConsentStatus;
  isConsentGranted: boolean;
  grantMarketingConsent: () => void;
  denyMarketingConsent: () => void;
  withdrawMarketingConsent: () => void;
}

const ConsentContext = createContext<ConsentContextValue>({
  marketingConsent: 'unset',
  isConsentGranted: false,
  grantMarketingConsent: () => {},
  denyMarketingConsent: () => {},
  withdrawMarketingConsent: () => {},
});

export const ConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [marketingConsent, setMarketingConsentState] = useState<MarketingConsentStatus>(() =>
    getMarketingConsent()
  );

  const grantMarketingConsent = useCallback(() => {
    setMarketingConsent('granted');
    setMarketingConsentState('granted');
  }, []);

  const denyMarketingConsent = useCallback(() => {
    setMarketingConsent('denied');
    setMarketingConsentState('denied');
  }, []);

  const withdrawMarketingConsent = useCallback(() => {
    setMarketingConsent('denied');
    setMarketingConsentState('denied');
  }, []);

  return (
    <ConsentContext.Provider
      value={{
        marketingConsent,
        isConsentGranted: marketingConsent === 'granted',
        grantMarketingConsent,
        denyMarketingConsent,
        withdrawMarketingConsent,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
};

export const useConsent = () => useContext(ConsentContext);
