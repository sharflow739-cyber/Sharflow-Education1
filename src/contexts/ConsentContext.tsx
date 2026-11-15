import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  MarketingConsentStatus,
  getMarketingConsent,
  setMarketingConsent,
  isBrowserPrivacyOptOut,
} from '../lib/metaPixel';

interface ConsentContextValue {
  marketingConsent: MarketingConsentStatus;
  isMarketingPermitted: boolean;
  isConsentGranted: boolean;
  isBrowserOptOut: boolean;
  grantMarketingConsent: () => void;
  denyMarketingConsent: () => void;
  withdrawMarketingConsent: () => void;
}

const ConsentContext = createContext<ConsentContextValue>({
  marketingConsent: 'unset',
  isMarketingPermitted: true,
  isConsentGranted: false,
  isBrowserOptOut: false,
  grantMarketingConsent: () => {},
  denyMarketingConsent: () => {},
  withdrawMarketingConsent: () => {},
});

export const ConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [marketingConsent, setMarketingConsentState] = useState<MarketingConsentStatus>(() =>
    getMarketingConsent()
  );
  const browserOptOut = isBrowserPrivacyOptOut();

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

  const isMarketingPermitted =
    marketingConsent === 'granted' || (marketingConsent === 'unset' && !browserOptOut);

  return (
    <ConsentContext.Provider
      value={{
        marketingConsent,
        isMarketingPermitted,
        isConsentGranted: marketingConsent === 'granted',
        isBrowserOptOut: browserOptOut && marketingConsent === 'unset',
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
