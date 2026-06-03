import React, { useState, useEffect } from 'react';
import './SystemSettings.css';
import { t } from './translations';
import { useSystemSettings } from './SystemSettingsContext';
import { buildApiUrl, API_ENDPOINTS } from './api';

const SystemSettings = ({ token }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const { getLanguage, refreshSettings } = useSystemSettings();
  const language = getLanguage();
  const [settings, setSettings] = useState({
    general: {
      systemName: 'CSMS',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      language: 'en'
    },
    security: {
      sessionTimeout: 30,
      passwordMinLength: 8,
      requireSpecialChars: true,
      maxLoginAttempts: 5,
      lockoutDuration: 15
    },
    notifications: {
      emailNotifications: true,
      systemAlerts: true,
      userRegistration: true,
      passwordReset: true
    },
    audit: {
      logLevel: 'INFO',
      retentionDays: 90,
      enableActivityLog: true,
      logFailedLogins: true
    }
  });

  // Load settings from backend on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(buildApiUrl(API_ENDPOINTS.SYSTEM_SETTINGS), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            setSettings(prev => ({
              ...prev,
              ...data.data
            }));
          }
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [token]);

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleSave = async (category) => {
    try {
      // Save to backend
      const response = await fetch(buildApiUrl(API_ENDPOINTS.SYSTEM_SETTINGS), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category,
          settings: settings[category]
        })
      });

      if (response.ok) {
        alert(`${t(language, 'settingsSavedSuccessfully')}`);
        // Refresh settings in all components
        refreshSettings();
      } else {
        const error = await response.json();
        alert(`${t(language, 'failedToSaveSettings')}: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      alert(t(language, 'errorSavingSettings'));
    }
  };

  const renderGeneralSettings = () => (
    <div className="settings-section">
      <h3>{t(language, 'generalSettings')}</h3>
      <div className="setting-item">
        <label>{t(language, 'systemName')}</label>
        <input
          type="text"
          value={settings.general.systemName}
          onChange={(e) => handleSettingChange('general', 'systemName', e.target.value)}
        />
      </div>
      <div className="setting-item">
        <label>{t(language, 'timezone')}</label>
        <select
          value={settings.general.timezone}
          onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
        >
          <option value="UTC">UTC</option>
          <option value="America/New_York">Eastern Time</option>
          <option value="America/Chicago">Central Time</option>
          <option value="America/Denver">Mountain Time</option>
          <option value="America/Los_Angeles">Pacific Time</option>
        </select>
      </div>
      <div className="setting-item">
        <label>{t(language, 'dateFormat')}</label>
        <select
          value={settings.general.dateFormat}
          onChange={(e) => handleSettingChange('general', 'dateFormat', e.target.value)}
        >
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
        </select>
      </div>
      <div className="setting-item">
        <label>{t(language, 'language')}</label>
        <select
          value={settings.general.language}
          onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
        >
          <option value="en">English</option>
          <option value="hi">हिंदी (Hindi)</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
      </div>
      <button onClick={() => handleSave('general')}>{t(language, 'saveGeneralSettings')}</button>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="settings-section">
      <h3>{t(language, 'securitySettings')}</h3>
      <div className="setting-item">
        <label>{t(language, 'sessionTimeout')}</label>
        <input
          type="number"
          value={settings.security.sessionTimeout}
          onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
          min="5"
          max="480"
        />
      </div>
      <div className="setting-item">
        <label>{t(language, 'passwordMinLength')}</label>
        <input
          type="number"
          value={settings.security.passwordMinLength}
          onChange={(e) => handleSettingChange('security', 'passwordMinLength', parseInt(e.target.value))}
          min="6"
          max="20"
        />
      </div>
      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={settings.security.requireSpecialChars}
            onChange={(e) => handleSettingChange('security', 'requireSpecialChars', e.target.checked)}
          />
          {t(language, 'requireSpecialChars')}
        </label>
      </div>
      <div className="setting-item">
        <label>{t(language, 'maxLoginAttempts')}</label>
        <input
          type="number"
          value={settings.security.maxLoginAttempts}
          onChange={(e) => handleSettingChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
          min="3"
          max="10"
        />
      </div>
      <div className="setting-item">
        <label>{t(language, 'accountLockoutDuration')}</label>
        <input
          type="number"
          value={settings.security.lockoutDuration}
          onChange={(e) => handleSettingChange('security', 'lockoutDuration', parseInt(e.target.value))}
          min="5"
          max="60"
        />
      </div>
      <button onClick={() => handleSave('security')}>{t(language, 'saveSecuritySettings')}</button>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="settings-section">
      <h3>{t(language, 'notificationSettings')}</h3>
      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={settings.notifications.emailNotifications}
            onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
          />
          {t(language, 'enableEmailNotifications')}
        </label>
      </div>
      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={settings.notifications.systemAlerts}
            onChange={(e) => handleSettingChange('notifications', 'systemAlerts', e.target.checked)}
          />
          {t(language, 'systemAlerts')}
        </label>
      </div>
      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={settings.notifications.userRegistration}
            onChange={(e) => handleSettingChange('notifications', 'userRegistration', e.target.checked)}
          />
          {t(language, 'userRegistrationNotifications')}
        </label>
      </div>
      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={settings.notifications.passwordReset}
            onChange={(e) => handleSettingChange('notifications', 'passwordReset', e.target.checked)}
          />
          {t(language, 'passwordResetNotifications')}
        </label>
      </div>
      <button onClick={() => handleSave('notifications')}>{t(language, 'saveNotificationSettings')}</button>
    </div>
  );

  const renderAuditSettings = () => (
    <div className="settings-section">
      <h3>{t(language, 'auditLoggingSettings')}</h3>
      <div className="setting-item">
        <label>{t(language, 'logLevel')}</label>
        <select
          value={settings.audit.logLevel}
          onChange={(e) => handleSettingChange('audit', 'logLevel', e.target.value)}
        >
          <option value="ERROR">ERROR</option>
          <option value="WARN">WARN</option>
          <option value="INFO">INFO</option>
          <option value="DEBUG">DEBUG</option>
        </select>
      </div>
      <div className="setting-item">
        <label>{t(language, 'logRetention')}</label>
        <input
          type="number"
          value={settings.audit.retentionDays}
          onChange={(e) => handleSettingChange('audit', 'retentionDays', parseInt(e.target.value))}
          min="30"
          max="365"
        />
      </div>
      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={settings.audit.enableActivityLog}
            onChange={(e) => handleSettingChange('audit', 'enableActivityLog', e.target.checked)}
          />
          {t(language, 'enableActivityLogging')}
        </label>
      </div>
      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={settings.audit.logFailedLogins}
            onChange={(e) => handleSettingChange('audit', 'logFailedLogins', e.target.checked)}
          />
          {t(language, 'logFailedLogins')}
        </label>
      </div>
      <button onClick={() => handleSave('audit')}>{t(language, 'saveAuditSettings')}</button>
    </div>
  );

  return (
    <div className="system-settings">
      <div className="section-header">
        <h2>{t(language, 'systemSettings')}</h2>
      </div>

      <div className="settings-tabs">
        <button 
          className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          {t(language, 'generalSettings')}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          {t(language, 'securitySettings')}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          {t(language, 'notificationSettings')}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          {t(language, 'auditLoggingSettings')}
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'general' && renderGeneralSettings()}
        {activeTab === 'security' && renderSecuritySettings()}
        {activeTab === 'notifications' && renderNotificationSettings()}
        {activeTab === 'audit' && renderAuditSettings()}
      </div>
    </div>
  );
};

export default SystemSettings;