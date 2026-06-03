import { useState, useMemo } from 'react';
import './NewMoneyTransfer.css';
import { buildApiUrl, API_ENDPOINTS } from './api';
import { preventScrollChange } from './inputUtils';

const NewMoneyTransfer = ({ token }) => {
  const placeholders = useMemo(() => ({
    onRequestOf: "Enter receiver name (Owner/Partner/Account/Person)",
    amount: "0.00",
    referenceNumber: "Enter cheque/UTR/reference number"
  }), []);

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    date: getTodayDate(),
    type: '',
    mode: '',
    amount: '',
    onRequestOf: '',
    referenceNumber: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Safe error setter
  const setSafeError = (err) => {
    if (typeof err === 'string') {
      setError(err);
    } else if (err && typeof err === 'object') {
      if (err.message) {
        setError(err.message);
      } else if (err.error) {
        setError(typeof err.error === 'string' ? err.error : 'An error occurred');
      } else {
        setError('An error occurred');
      }
    } else {
      setError('An error occurred');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isFormValid = () => {
    return formData.date &&
           formData.type &&
           formData.mode &&
           formData.amount &&
           parseFloat(formData.amount) > 0 &&
           formData.onRequestOf;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      setSafeError('Please fill all required fields');
      return;
    }

    // Validate date is not in future
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate > today) {
      setSafeError('Transfer date cannot be in the future');
      return;
    }

    setLoading(true);
    setSafeError('');
    setSuccess('');

    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.MONEY_TRANSFERS_CREATE), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSuccess(`Money transfer created successfully! Transfer ID: ${result.data.transferId}`);
          
          // Reset form
          setFormData({
            date: getTodayDate(),
            type: '',
            mode: '',
            amount: '',
            onRequestOf: '',
            referenceNumber: ''
          });
        } else {
          setSafeError(result.error || 'Failed to create money transfer');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create money transfer' }));
        setSafeError(errorData.error || 'Failed to create money transfer');
      }
    } catch (err) {
      setSafeError('Error creating money transfer: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-money-transfer">
      <div className="page-header">
        <h2>New Money Transfer</h2>
        <p>Record internal fund transfers between store managers, cashiers and owners</p>
      </div>

      {error && <div className="error-message">✗ {error}</div>}
      {success && <div className="success-message">✓ {success}</div>}

      <form onSubmit={handleSubmit}>
        {/* Transfer Metadata */}
        <div className="form-section">
          <h3>Transfer Details</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Transfer Date *</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                max={getTodayDate()}
                required
              />
              <small>Cannot be a future date</small>
            </div>

            <div className="form-group">
              <label>Transfer Type *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Type</option>
                <option value="INWARD">INWARD (Credit - Money In)</option>
                <option value="OUTWARD">OUTWARD (Debit - Money Out)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Transfer Mode *</label>
              <select
                name="mode"
                value={formData.mode}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Mode</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Online">Online</option>
              </select>
            </div>

            <div className="form-group">
              <label>Transferred To / On Request Of *</label>
              <input
                type="text"
                name="onRequestOf"
                value={formData.onRequestOf}
                onChange={handleInputChange}
                placeholder={placeholders.onRequestOf}
                maxLength={32}
                required
              />
            </div>

            <div className="form-group">
              <label>Amount (₹) *</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                onWheel={preventScrollChange}
                placeholder={placeholders.amount}
                min="0.01"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label>Reference / Cheque Number</label>
              <input
                type="text"
                name="referenceNumber"
                value={formData.referenceNumber}
                onChange={handleInputChange}
                placeholder={placeholders.referenceNumber}
                maxLength={32}
              />
              <small>Optional: Cheque number, UTR, or transaction reference</small>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn-create"
            disabled={!isFormValid() || loading}
          >
            {loading ? 'Creating...' : 'Create Transfer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewMoneyTransfer;
