import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AppSettings } from '../types';

const defaultSettings: AppSettings = {
  appName: 'RCCM | Reminder',
  appIcon: '🙏',
  primaryColor: '#4f46e5',
  secondaryColor: '#7c3aed',
  accentColor: '#06b6d4',
  teams: ['Music Team', 'Hospitality Team', 'Tech Team'],
};

interface AppSettingsContextType {
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsContextType>({
  settings: defaultSettings,
  updateSettings: async () => {},
});

export const useAppSettings = () => useContext(AppSettingsContext);

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    const ref = doc(db, 'appSettings', 'main');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setSettings({ ...defaultSettings, ...snap.data() as AppSettings });
      }
    });
    return unsub;
  }, []);

  const updateSettings = async (s: Partial<AppSettings>) => {
    const ref = doc(db, 'appSettings', 'main');
    await setDoc(ref, { ...settings, ...s }, { merge: true });
  };

  return (
    <AppSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
};
