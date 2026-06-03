import { useState, useMemo } from 'react';
import './NewExpenditure.css';
import { buildApiUrl, API_ENDPOINTS } from './api';
import { preventScrollChange } from './inputUtils';

const NewExpenditure = ({ user, token }) => {
  const placeholders = useMemo(() => ({
    expenseId: "Enter expense ID",
    expenseType: "Enter expense type",
    expenseDescription: "Enter expense description",
    paymentMode: "Enter payment mode (Cash/Cheque/Online)",
    paymentApproval: "Enter approver username",
    paidTo: "Enter person/vendor/worker name",
    amount: "0.00"
  }), []);

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    expenseId: '',
    expenseType: '',
    expenseDate: getTodayDate(),
    expenseDescription: '',
    paymentMode: '',
    paymentApproval: '',
    paidTo: '',
    amount: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Safe error setter to ensure error is always a string
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
    return formData.expenseId &&
           formData.expenseType &&
           formData.expenseDate &&
           formData.expenseDescription &&
           formData.paymentMode &&
           formData.paymentApproval &&
           formData.paidTo &&
           formData.amount &&
           parseFloat(formData.amount) > 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      setSafeError('Please fill all required fields');
      return;
    }

    setLoading(true);
    setSafeError('');
    setSuccess('');

    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.EXPENDITURES_CREATE), {
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
          setSuccess(`Expenditure created successfully! Expense ID: ${result.data.expenseId}`);
          
          // Reset form
          setFormData({
            expenseId: '',
            expenseType: '',
            expenseDate: getTodayDate(),
            expenseDescription: '',
            paymentMode: '',
            paymentApproval: '',
            paidTo: '',
            amount: ''
          });
        } else {
          setSafeError(result.error || 'Failed to create expenditure');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create expenditure' }));
        setSafeError(errorData.error || 'Failed to create expenditure');
      }
    } catch (err) {
      setSafeError('Error creating expenditure: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-expenditure">
      <div className="page-header">
        <h2>New Expenditure Voucher</h2>
        <p>Manual expense entry for day-to-day operational expenses</p>
      </div>

      {error && <div className="error-message">✗ {error}</div>}
      {success && <div className="success-message">✓ {success}</div>}

      <form onSubmit={handleSubmit}>
        {/* Voucher Identification */}
        <div className="form-section">
          <h3>1. Voucher Identification</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Expense ID * (max 30 chars)</label>
              <input
                type="text"
                name="expenseId"
                value={formData.expenseId}
                onChange={handleInputChange}
                placeholder={placeholders.expenseId}
                maxLength={30}
                required
              />
            </div>

            <div className="form-group">
              <label>Expense Type * (max 30 chars)</label>
              <input
                type="text"
                name="expenseType"
                value={formData.expenseType}
                onChange={handleInputChange}
                placeholder={placeholders.expenseType}
                maxLength={30}
                required
              />
            </div>

            <div className="form-group">
              <label>Expense Date *</label>
              <input
                type="date"
                name="expenseDate"
                value={formData.expenseDate}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
        </div>

        {/* Expense Details */}
        <div className="form-section">
          <h3>2. Expense Details</h3>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Expense Description * (max 100 chars)</label>
              <input
                type="text"
                name="expenseDescription"
                value={formData.expenseDescription}
                onChange={handleInputChange}
                placeholder={placeholders.expenseDescription}
                maxLength={100}
                required
              />
            </div>

            <div className="form-group">
              <label>Payment Mode * (max 100 chars)</label>
              <input
                type="text"
                name="paymentMode"
                value={formData.paymentMode}
                onChange={handleInputChange}
                placeholder={placeholders.paymentMode}
                maxLength={100}
                required
              />
            </div>

            <div className="form-group">
              <label>Paid To * (max 100 chars)</label>
              <input
                type="text"
                name="paidTo"
                value={formData.paidTo}
                onChange={handleInputChange}
                placeholder={placeholders.paidTo}
                maxLength={100}
                required
              />
            </div>
          </div>
        </div>

        {/* Amount & Approval */}
        <div className="form-section">
          <h3>3. Amount & Approval</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Amount (₹) *</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                onWheel={preventScrollChange}
                placeholder={placeholders.amount}
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label>Payment Approval *</label>
              <input
                type="text"
                name="paymentApproval"
                value={formData.paymentApproval}
                onChange={handleInputChange}
                placeholder={placeholders.paymentApproval}
                required
              />
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
            {loading ? 'Creating...' : 'Create Voucher'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewExpenditure;
