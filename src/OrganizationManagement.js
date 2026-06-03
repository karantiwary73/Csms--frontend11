import React, { useState, useEffect } from 'react';
import './OrganizationManagement.css';
import { getApiErrorMessage } from './errorUtils';
import { buildApiUrl, API_ENDPOINTS } from './api';

const OrganizationManagement = ({ user, token }) => {
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    contactInfo: {
      phone: '',
      email: '',
      website: ''
    },
    geoLocation: {
      latitude: '',
      longitude: ''
    },
    smtpConfig: {
      host: '',
      port: '',
      secure: false,
      auth: {
        user: '',
        pass: ''
      },
      from: ''
    }
  });

  // Report email state
  const [reportEmails, setReportEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSaveMsg, setEmailSaveMsg] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sendingReport, setSendingReport] = useState(false);
  const [sendReportMsg, setSendReportMsg] = useState('');

  useEffect(() => {
    fetchOrganization();
    fetchReportEmails();
  }, []);

  const fetchReportEmails = async () => {
    try {
      const res = await fetch(buildApiUrl(API_ENDPOINTS.REPORT_EMAILS), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReportEmails(data.reportEmails || []);
      }
    } catch (err) {
      // silent
    }
  };

  const addEmail = () => {
    const trimmed = newEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    if (reportEmails.includes(trimmed)) {
      setEmailError('This email is already in the list.');
      return;
    }
    setReportEmails([...reportEmails, trimmed]);
    setNewEmail('');
    setEmailError('');
  };

  const removeEmail = (idx) => {
    setReportEmails(reportEmails.filter((_, i) => i !== idx));
    setEmailError('');
  };

  const saveEmails = async () => {
    setEmailLoading(true);
    setEmailSaveMsg('');
    setEmailError('');
    try {
      const res = await fetch(buildApiUrl(API_ENDPOINTS.REPORT_EMAILS), {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportEmails })
      });
      const data = await res.json();
      if (res.ok) {
        setEmailSaveMsg('✅ Email list saved successfully!');
        setReportEmails(data.reportEmails || reportEmails);
      } else {
        setEmailError(data.error || 'Failed to save email list.');
      }
    } catch (err) {
      setEmailError('Network error. Please try again.');
    } finally {
      setEmailLoading(false);
      setTimeout(() => setEmailSaveMsg(''), 3000);
    }
  };

  const sendTestReport = async () => {
    setSendingReport(true);
    setSendReportMsg('');
    try {
      const res = await fetch(buildApiUrl(API_ENDPOINTS.REPORT_EMAILS_SEND_NOW), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId: null })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSendReportMsg('✅ Report sent successfully to all recipients!');
      } else {
        setSendReportMsg('❌ ' + (data.error || 'Failed to send report.'));
      }
    } catch (err) {
      setSendReportMsg('❌ Network error. Please try again.');
    } finally {
      setSendingReport(false);
      setTimeout(() => setSendReportMsg(''), 5000);
    }
  };

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      
      // Get the first organization (for single-tenant setup)
      const response = await fetch(buildApiUrl(API_ENDPOINTS.ORGANIZATION_FIRST), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrganization(data.organization);
        setFormData(data.organization);
        setError('');
      } else if (response.status === 404) {
        // Organization doesn't exist, allow creation
        setOrganization(null);
        setError('');
      } else {
        const data = await response.json();
        setError(getApiErrorMessage(data, 'Failed to fetch organization'));
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Prepare data with proper type conversions
      const preparedData = {
        ...formData,
        geoLocation: {
          latitude: formData.geoLocation?.latitude ? parseFloat(formData.geoLocation.latitude) : undefined,
          longitude: formData.geoLocation?.longitude ? parseFloat(formData.geoLocation.longitude) : undefined
        },
        smtpConfig: {
          ...formData.smtpConfig,
          port: formData.smtpConfig?.port ? parseInt(formData.smtpConfig.port) : undefined,
          secure: Boolean(formData.smtpConfig?.secure)
        }
      };

      // Remove undefined values to avoid validation issues
      if (!preparedData.geoLocation.latitude && !preparedData.geoLocation.longitude) {
        delete preparedData.geoLocation;
      }
      if (!preparedData.smtpConfig.host) {
        delete preparedData.smtpConfig;
      }

      const url = organization 
        ? `${buildApiUrl(API_ENDPOINTS.ORGANIZATION)}/${organization._id}`
        : buildApiUrl(API_ENDPOINTS.ORGANIZATION);
      
      const method = organization ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preparedData)
      });

      const data = await response.json();

      if (response.ok) {
        setOrganization(data.organization);
        setEditing(false);
        setError('');
      } else {
        setError(getApiErrorMessage(data, 'Failed to save organization'));
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleInputChange = (path, value) => {
    const keys = path.split('.');
    const newFormData = { ...formData };
    
    let current = newFormData;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    setFormData(newFormData);
  };

  const startEdit = () => {
    setEditing(true);
    if (organization) {
      setFormData({ ...organization });
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    if (organization) {
      setFormData({ ...organization });
    }
  };

  if (loading) {
    return <div className="loading">Loading organization...</div>;
  }

  return (
    <div className="organization-management">
      <div className="section-header">
        <h2>Organization Management</h2>
        {!editing && (
          <button className="edit-btn" onClick={startEdit}>
            {organization ? 'Edit Organization' : 'Create Organization'}
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {editing ? (
        <form onSubmit={handleSave} className="org-form">
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-group">
              <label>Organization Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Address</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Street</label>
                <input
                  type="text"
                  value={formData.address?.street || ''}
                  onChange={(e) => handleInputChange('address.street', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={formData.address?.city || ''}
                  onChange={(e) => handleInputChange('address.city', e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  value={formData.address?.state || ''}
                  onChange={(e) => handleInputChange('address.state', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Zip Code</label>
                <input
                  type="text"
                  value={formData.address?.zipCode || ''}
                  onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  value={formData.address?.country || ''}
                  onChange={(e) => handleInputChange('address.country', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Contact Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  value={formData.contactInfo?.phone || ''}
                  onChange={(e) => handleInputChange('contactInfo.phone', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.contactInfo?.email || ''}
                  onChange={(e) => handleInputChange('contactInfo.email', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Website</label>
                <input
                  type="url"
                  value={formData.contactInfo?.website || ''}
                  onChange={(e) => handleInputChange('contactInfo.website', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>SMTP Configuration</h3>
            <div className="form-row">
              <div className="form-group">
                <label>SMTP Host</label>
                <input
                  type="text"
                  value={formData.smtpConfig?.host || ''}
                  onChange={(e) => handleInputChange('smtpConfig.host', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Port</label>
                <input
                  type="number"
                  value={formData.smtpConfig?.port || ''}
                  onChange={(e) => handleInputChange('smtpConfig.port', e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={formData.smtpConfig?.auth?.user || ''}
                  onChange={(e) => handleInputChange('smtpConfig.auth.user', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={formData.smtpConfig?.auth?.pass || ''}
                  onChange={(e) => handleInputChange('smtpConfig.auth.pass', e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>From Email</label>
              <input
                type="email"
                value={formData.smtpConfig?.from || ''}
                onChange={(e) => handleInputChange('smtpConfig.from', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.smtpConfig?.secure || false}
                  onChange={(e) => handleInputChange('smtpConfig.secure', e.target.checked)}
                />
                Use SSL/TLS
              </label>
            </div>
            
            {/* SMTP Configuration Guide */}
            <div className="smtp-guide">
              <h4>📧 SMTP Configuration Guide</h4>
              <div className="guide-content">
                <div className="guide-section">
                  <strong>Gmail Setup:</strong>
                  <ul>
                    <li>Host: smtp.gmail.com</li>
                    <li>Port: 587</li>
                    <li>Username: your-email@gmail.com</li>
                    <li>Password: Use App Password (not your regular password)</li>
                    <li>SSL/TLS: Unchecked (uses STARTTLS)</li>
                  </ul>
                </div>
                <div className="guide-section">
                  <strong>How to get Gmail App Password:</strong>
                  <ol>
                    <li>Go to Google Account settings</li>
                    <li>Enable 2-Factor Authentication</li>
                    <li>Go to Security → App passwords</li>
                    <li>Generate password for "Mail"</li>
                    <li>Use the generated password here</li>
                  </ol>
                </div>
                <div className="guide-note">
                  <strong>⚠️ Development Mode:</strong> If SMTP is not configured, password reset emails will be logged to the server console instead of being sent.
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={cancelEdit}>Cancel</button>
            <button type="submit">Save Organization</button>
          </div>
        </form>
      ) : (
        <div className="org-display">
          {organization ? (
            <div className="org-info">
              <div className="info-section">
                <h3>Basic Information</h3>
                <p><strong>Name:</strong> {organization.name}</p>
              </div>

              {organization.address && (
                <div className="info-section">
                  <h3>Address</h3>
                  <p>
                    {[
                      organization.address.street,
                      organization.address.city,
                      organization.address.state,
                      organization.address.zipCode,
                      organization.address.country
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}

              {organization.contactInfo && (
                <div className="info-section">
                  <h3>Contact Information</h3>
                  {organization.contactInfo.phone && <p><strong>Phone:</strong> {organization.contactInfo.phone}</p>}
                  {organization.contactInfo.email && <p><strong>Email:</strong> {organization.contactInfo.email}</p>}
                  {organization.contactInfo.website && <p><strong>Website:</strong> {organization.contactInfo.website}</p>}
                </div>
              )}

              {organization.smtpConfig && (
                <div className="info-section">
                  <h3>SMTP Configuration</h3>
                  <p><strong>Host:</strong> {organization.smtpConfig.host}</p>
                  <p><strong>Port:</strong> {organization.smtpConfig.port}</p>
                  <p><strong>Secure:</strong> {organization.smtpConfig.secure ? 'Yes' : 'No'}</p>
                  <p><strong>From:</strong> {organization.smtpConfig.from}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="no-org">
              <h3>No Organization Configured</h3>
              <p>Click "Create Organization" to set up your organization profile.</p>
            </div>
          )}
        </div>
      )}
      {/* Daily Report Emails Section — always visible to ADMIN */}
      <div className="org-section report-emails-section">
        <div className="section-header">
          <h2>📧 Daily Report Emails</h2>
        </div>
        <p className="section-desc">Add email addresses to receive automated daily reports at 9:00 AM and 9:00 PM (IST).</p>

        <div className="email-list">
          {reportEmails.length === 0 ? (
            <p className="no-emails">No recipients configured yet.</p>
          ) : (
            reportEmails.map((email, idx) => (
              <div className="email-chip" key={idx}>
                <span>{email}</span>
                <button
                  type="button"
                  className="remove-email-btn"
                  onClick={() => removeEmail(idx)}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        <div className="add-email-row">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => { setNewEmail(e.target.value); setEmailError(''); }}
            placeholder="Enter email address"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
          />
          <button type="button" className="add-email-btn" onClick={addEmail}>
            + Add
          </button>
        </div>

        {emailError && <p className="email-error">{emailError}</p>}
        {emailSaveMsg && <p className="email-success">{emailSaveMsg}</p>}

        <div className="email-actions">
          <button
            type="button"
            className="save-emails-btn"
            onClick={saveEmails}
            disabled={emailLoading}
          >
            {emailLoading ? 'Saving...' : '💾 Save Email List'}
          </button>
          <button
            type="button"
            className="send-report-btn"
            onClick={sendTestReport}
            disabled={sendingReport || reportEmails.length === 0}
            title={reportEmails.length === 0 ? 'Add at least one email first' : 'Send report now'}
          >
            {sendingReport ? 'Sending...' : '📤 Send Report Now'}
          </button>
        </div>

        {sendReportMsg && <p className={sendReportMsg.startsWith('✅') ? 'email-success' : 'email-error'}>{sendReportMsg}</p>}
      </div>
    </div>
  );
};

export default OrganizationManagement;