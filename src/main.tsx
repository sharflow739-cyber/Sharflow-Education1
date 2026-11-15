import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { SettingsProvider } from './contexts/SettingsContext';
import { ConsentProvider } from './contexts/ConsentContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <ConsentProvider>
        <App />
      </ConsentProvider>
    </SettingsProvider>
  </StrictMode>,
);
