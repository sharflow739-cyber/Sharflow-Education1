import React, { createContext, useContext, useState, useEffect } from 'react';
import { SiteSettings, DEFAULT_SITE_SETTINGS } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface SettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  updateSettings: (newSettings: Partial<SiteSettings>) => Promise<{ success: boolean; error?: string }>;
  resetSettingsGroup: (keys: (keyof SiteSettings)[]) => Promise<{ success: boolean; error?: string }>;
  reloadSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SITE_SETTINGS,
  loading: true,
  updateSettings: async () => ({ success: false }),
  resetSettingsGroup: async () => ({ success: false }),
  reloadSettings: async () => {},
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('data')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data?.data && typeof data.data === 'object') {
        const merged: SiteSettings = {
          ...DEFAULT_SITE_SETTINGS,
          ...data.data,
        };
        setSettings(merged);
        if (merged.browser_title) {
          document.title = merged.browser_title;
        }
      }
    } catch (err) {
      console.error('Failed to load site settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings.browser_title) {
      document.title = settings.browser_title;
    }
  }, [settings.browser_title]);

  const updateSettings = async (partial: Partial<SiteSettings>): Promise<{ success: boolean; error?: string }> => {
    const nextSettings: SiteSettings = {
      ...settings,
      ...partial,
    };

    if (!isSupabaseConfigured || !supabase) {
      setSettings(nextSettings);
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          id: 1,
          data: nextSettings,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        return { success: false, error: error.message };
      }

      setSettings(nextSettings);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে';
      return { success: false, error: msg };
    }
  };

  const resetSettingsGroup = async (keys: (keyof SiteSettings)[]): Promise<{ success: boolean; error?: string }> => {
    const patch: Partial<SiteSettings> = {};
    for (const key of keys) {
      // @ts-expect-error dynamic assign from defaults
      patch[key] = DEFAULT_SITE_SETTINGS[key];
    }
    return updateSettings(patch);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        updateSettings,
        resetSettingsGroup,
        reloadSettings: fetchSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
