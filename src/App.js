import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './Login';
import ViewManager from './ViewManager';
import PasswordReset from './PasswordReset';
import IssueRebate from './IssueRebate';
import RebateHistory from './RebateHistory';
import { SystemSettingsProvider } from './SystemSettingsContext';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [currentView, setCurrentView] = useState('login');

  // Prevent number inputs from changing value on scroll
  useEffect(() => {
    const preventNumberInputScroll = (e) => {
      // Check if the active element is a number input
      if (document.activeElement && document.activeElement.type === 'number') {
        // Blur the input to prevent value changes
        document.activeElement.blur();
      }
    };

    // Add wheel event listener with passive: true to avoid warnings
    document.addEventListener('wheel', preventNumberInputScroll, { passive: true });

    // Cleanup
    return () => {
      document.removeEventListener('wheel', preventNumberInputScroll);
    };
  }, []);

  useEffect(() => {
    // Check URL for password reset
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    
    if (resetToken) {
      setCurrentView('reset-password');
      return;
    }

    // Check if user is already logged in
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      
      // Validate user data - if name is missing or equals username, it's old data
      if (!parsedUser.name || parsedUser.name === parsedUser.username) {
        console.log('⚠️ User data needs refresh - name field is missing or invalid');
        // Clear old data and force re-login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setCurrentView('login');
        return;
      }
      
      setToken(savedToken);
      setUser(parsedUser);
      setCurrentView('dashboard');
    }
  }, []);

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentView('login');
  };

  const handleBackToLogin = () => {
    setCurrentView('login');
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  return (
    <div className="App">
      <SystemSettingsProvider token={token}>
        {currentView === 'dashboard' && user ? (
          <ViewManager user={user} token={token} onLogout={handleLogout} />
        ) : currentView === 'reset-password' ? (
          <PasswordReset onBackToLogin={handleBackToLogin} />
        ) : (
          <Login onLogin={handleLogin} />
        )}
      </SystemSettingsProvider>
    </div>
  );
}

export default App;