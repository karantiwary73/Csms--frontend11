import React, { useState, useEffect } from 'react';
import './Login.css';
import { getApiErrorMessage } from './errorUtils';
import { useSystemSettings } from './SystemSettingsContext';
import { t } from './translations';
import { buildApiUrl, API_ENDPOINTS } from './api';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const { getSystemName, getLanguage } = useSystemSettings();
  const language = getLanguage();

  useEffect(() => {
    // Update page title with system name
    document.title = `${getSystemName()} - ${t(language, 'login')}`;
  }, [getSystemName, language]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.LOGIN), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.user, data.token);
      } else {
        setError(getApiErrorMessage(data, 'Login failed'));
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordMessage('');
    setError('');
    setForgotPasswordLoading(true);

    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.FORGOT_PASSWORD), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        const message = data.devMode 
          ? 'Development Mode: Check server console for reset token details.'
          : 'Password reset email sent! Check your inbox.';
        setForgotPasswordMessage(message);
        setForgotPasswordEmail('');
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotPasswordMessage('');
        }, data.devMode ? 5000 : 3000);
      } else {
        setError(getApiErrorMessage(data, 'Failed to send reset email'));
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>{getSystemName()}</h1>
        
        {!showForgotPassword ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t(language, 'email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>{t(language, 'password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" disabled={loading}>
              {loading ? t(language, 'loggingIn') : t(language, 'login')}
            </button>
            <div className="forgot-password-link">
              <button 
                type="button" 
                className="link-button"
                onClick={() => setShowForgotPassword(true)}
              >
                {t(language, 'forgotPassword')}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword}>
            <h2>{t(language, 'resetPassword')}</h2>
            <div className="form-group">
              <label>{t(language, 'email')}</label>
              <input
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                placeholder="Enter your email address"
                required
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            {forgotPasswordMessage && <div className="success-message">{forgotPasswordMessage}</div>}
            <button type="submit" disabled={forgotPasswordLoading}>
              {forgotPasswordLoading ? t(language, 'sending') : t(language, 'sendResetEmail')}
            </button>
            <div className="back-to-login">
              <button 
                type="button" 
                className="link-button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError('');
                  setForgotPasswordMessage('');
                  setForgotPasswordEmail('');
                }}
              >
                {t(language, 'backToLogin')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;