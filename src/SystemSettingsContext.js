import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { buildApiUrl, API_ENDPOINTS } from './api';

const SystemSettingsContext = createContext();

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error('useSystemSettings must be used within SystemSettingsProvider');
  }
  return context;
};

export const SystemSettingsProvider = ({ children, token }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.SYSTEM_SETTINGS), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.data || {});
      }
    } catch (err) {
      console.error('Error loading system settings:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadSettings();
    }
  }, [token, loadSettings, refreshTrigger]);

  const refreshSettings = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const value = {
    settings,
    loading,
    refreshSettings,
    getSystemName: () => settings?.general?.systemName || 'CSMS',
    getTimezone: () => settings?.general?.timezone || 'UTC',
    getDateFormat: () => settings?.general?.dateFormat || 'YYYY-MM-DD',
    getLanguage: () => settings?.general?.language || 'en',
    getSessionTimeout: () => settings?.security?.sessionTimeout || 30,
    getPasswordMinLength: () => settings?.security?.passwordMinLength || 8,
    getRequireSpecialChars: () => settings?.security?.requireSpecialChars !== false,
    getMaxLoginAttempts: () => settings?.security?.maxLoginAttempts || 5,
    getLockoutDuration: () => settings?.security?.lockoutDuration || 15,
    isEmailNotificationsEnabled: () => settings?.notifications?.emailNotifications !== false,
    isSystemAlertsEnabled: () => settings?.notifications?.systemAlerts !== false,
    isUserRegistrationNotificationsEnabled: () => settings?.notifications?.userRegistration !== false,
    isPasswordResetNotificationsEnabled: () => settings?.notifications?.passwordReset !== false,
    getLogLevel: () => settings?.audit?.logLevel || 'INFO',
    getRetentionDays: () => settings?.audit?.retentionDays || 90,
    isActivityLoggingEnabled: () => settings?.audit?.enableActivityLog !== false,
    isFailedLoginLoggingEnabled: () => settings?.audit?.logFailedLogins !== false
  };

  return (
    <SystemSettingsContext.Provider value={value}>
      {children}
    </SystemSettingsContext.Provider>
  );
};
