import React, { createContext, useContext, useState, useEffect } from "react";
import type {
  SyncSettings,
  SettingsContextType,
  SyncTelemetry,
} from "../types";
import * as SecureStore from "expo-secure-store";

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

const SETTINGS_KEY = "app_sync_settings";
const TELEMETRY_KEY = "app_sync_telemetry";

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<SyncSettings>({
    autoUploadEnabled: true,
    onlyWiFi: false,
  });

  const [telemetry, setTelemetry] = useState<SyncTelemetry>({
    autoSyncRuns: 0,
    successfulUploads: 0,
    failedUploads: 0,
    lastSyncTime: null,
  });

  // Load settings and telemetry on mount
  useEffect(() => {
    void (async () => {
      try {
        const storedSettings = await SecureStore.getItemAsync(SETTINGS_KEY);
        if (storedSettings) {
          setSettings(JSON.parse(storedSettings));
        }

        const storedTelemetry = await SecureStore.getItemAsync(TELEMETRY_KEY);
        if (storedTelemetry) {
          setTelemetry(JSON.parse(storedTelemetry));
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    })();
  }, []);

  const updateSettings = async (
    updates: Partial<SyncSettings>
  ): Promise<void> => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    try {
      await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const resetTelemetry = async (): Promise<void> => {
    const newTelemetry: SyncTelemetry = {
      autoSyncRuns: 0,
      successfulUploads: 0,
      failedUploads: 0,
      lastSyncTime: null,
    };
    setTelemetry(newTelemetry);
    try {
      await SecureStore.setItemAsync(
        TELEMETRY_KEY,
        JSON.stringify(newTelemetry)
      );
    } catch (error) {
      console.error("Error resetting telemetry:", error);
    }
  };

  const value: SettingsContextType = {
    settings,
    telemetry,
    updateSettings,
    resetTelemetry,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
