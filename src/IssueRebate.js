import React, { useState, useMemo } from 'react';
import './IssueRebate.css';
import { buildApiUrl, API_ENDPOINTS } from './api';
import { preventScrollChange } from './inputUtils';

const IssueRebate = ({ user, token }) => {
  // Memoized placeholder values to prevent recalculation during re-renders
  const placeholders = useMemo(() => ({
    agreementNumber: "Enter agreement number",
    rebateAmount: "Enter rebate amount",
    rebatePerQuintal: "Enter rebate per quintal",
    rebateReason: "Enter reason for rebate (optional)"
  }), []);

  const [searchNumber, setSearchNumber] = useState('');
  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Rebate form state
  const [rebateForm, setRebateForm] = useState({
    rebateType: 'amount', // 'amount' or 'rate'
    rebateAmount: '',
    rebatePerQuintalRate: '',
    rebateReason: ''
  });
  
  // Calculation preview
  const [calculationPreview, setCalculationPreview] = useState(null);

  const handleSearch = async () => {
    if (!searchNumber.trim()) {
      setError('Please enter an agreement number');
      return;
    }

    setLoading(true);
    setError('');
    setAgreement(null);
    setCalculationPreview(null);

    try {
      // Search for agreement by agreement number using history endpoint
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.AGREEMENTS_HISTORY)}?agreementNumber=${searchNumber.trim()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Agreement not found');
      }

      if (!result.data || result.data.length === 0) {
        throw new Error('No agreement found with this number');
      }

      const foundAgreement = result.data[0];
      
      // Get rebate-specific agreement details
      const rebateResponse = await fetch(`${buildApiUrl(API_ENDPOINTS.REBATES_AGREEMENT)}/${foundAgreement._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const rebateResult = await rebateResponse.json();

      if (!rebateResponse.ok) {
        throw new Error(rebateResult.error || 'Failed to load agreement details');
      }

      setAgreement(rebateResult.data);
      
      // Reset form
      setRebateForm({
        rebateType: 'amount',
        rebateAmount: '',
        rebatePerQuintalRate: '',
        rebateReason: ''
      });

    } catch (err) {
      console.error('Search error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRebateForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear preview when form changes
    setCalculationPreview(null);
  };

  const handlePreviewCalculation = async () => {
    if (!agreement) return;
    
    const { rebateType, rebateAmount, rebatePerQuintalRate } = rebateForm;
    
    // Validation
    if (rebateType === 'amount' && (!rebateAmount || parseFloat(rebateAmount) <= 0)) {
      setError('Please enter a valid rebate amount');
      return;
    }
    
    if (rebateType === 'rate' && (!rebatePerQuintalRate || parseFloat(rebatePerQuintalRate) <= 0)) {
      setError('Please enter a valid rebate per quintal rate');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.REBATES_PREVIEW), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agreementId: agreement.agreement._id,
          rebateAmount: rebateType === 'amount' ? parseFloat(rebateAmount) : null,
          rebatePerQuintalRate: rebateType === 'rate' ? parseFloat(rebatePerQuintalRate) : null,
          rebateType
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to calculate rebate');
      }

      setCalculationPreview(result.data.calculation);
    } catch (err) {
      console.error('Preview calculation error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueRebate = async () => {
    if (!agreement || !calculationPreview) {
      setError('Please preview the calculation first');
      return;
    }

    if (!window.confirm('Are you sure you want to issue this rebate? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.REBATES_ISSUE), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agreementId: agreement.agreement._id,
          rebateAmount: rebateForm.rebateType === 'amount' ? parseFloat(rebateForm.rebateAmount) : null,
          rebatePerQuintalRate: rebateForm.rebateType === 'rate' ? parseFloat(rebateForm.rebatePerQuintalRate) : null,
          rebateType: rebateForm.rebateType,
          rebateReason: rebateForm.rebateReason
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to issue rebate');
      }

      setSuccess(`Rebate issued successfully! Net payable amount: ₹${calculationPreview.netPayableAfterRebate.toLocaleString('en-IN')}`);
      
      // Reset form and clear agreement
      setAgreement(null);
      setCalculationPreview(null);
      setSearchNumber('');
      setRebateForm({
        rebateType: 'amount',
        rebateAmount: '',
        rebatePerQuintalRate: '',
        rebateReason: ''
      });
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Issue rebate error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate current payable amount
  const currentPayableAmount = agreement ? agreement.currentPayableAmount : 0;
  
  // Check if rebate can be issued
  const canIssueRebate = agreement && !agreement.hasActiveRebate && calculationPreview && 
                        calculationPreview.netPayableAfterRebate >= 0;

  return (
    <div className="issue-rebate">
      <div className="page-header">
        <h2>💰 Issue Rebate</h2>
        <p>Apply financial rebate (discount) on existing agreement's storage charges</p>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <h3>Search Agreement</h3>
        <div className="search-form">
          <div className="form-group">
            <label>Agreement Number *</label>
            <input
              type="text"
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              placeholder={placeholders.agreementNumber}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button 
            onClick={handleSearch} 
            className="btn-find"
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Find'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Agreement Information (Read-only) */}
      {agreement && (
        <>
          <div className="agreement-info-section">
            <h3>Agreement Information</h3>
            {agreement.hasActiveRebate && (
              <div className="warning-message">
                ⚠️ This agreement already has an active rebate. Cancel the existing rebate first to issue a new one.
              </div>
            )}
            <div className="info-grid">
              <div className="info-item">
                <label>Agreement Number:</label>
                <span>{agreement.agreement.agreementId}</span>
              </div>
              <div className="info-item">
                <label>Lot Number:</label>
                <span>{agreement.agreement.lotNumber}</span>
              </div>
              <div className="info-item">
                <label>Name:</label>
                <span>{agreement.agreement.customerName || '-'}</span>
              </div>
              <div className="info-item">
                <label>Father's Name:</label>
                <span>{agreement.agreement.fatherName || '-'}</span>
              </div>
              <div className="info-item">
                <label>Mobile:</label>
                <span>{agreement.agreement.mobile || '-'}</span>
              </div>
              <div className="info-item">
                <label>Address:</label>
                <span>{agreement.agreement.addressLine1 || '-'}</span>
              </div>
              <div className="info-item">
                <label>Weight (Quintals):</label>
                <span>{agreement.agreement.weightInQuintal}</span>
              </div>
              <div className="info-item">
                <label>Number of Bags:</label>
                <span>{agreement.agreement.numberOfBags}</span>
              </div>
            </div>
            
            <div className="charges-summary">
              <h4>Current Charges</h4>
              <div className="charges-grid">
                <div className="charge-item">
                  <label>Advance Paid:</label>
                  <span>₹{(agreement.agreement.charges?.advanceStorageChargesPaid || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="charge-item">
                  <label>Total Charge:</label>
                  <span>₹{(agreement.agreement.charges?.totalStorageCharge || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="charge-item">
                  <label>Handling Charge:</label>
                  <span>₹{(agreement.agreement.charges?.handlingChargeDue || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="charge-item">
                  <label>Bag Charges:</label>
                  <span>₹{((agreement.agreement.charges?.bagChargeTotal || 0) - (agreement.agreement.charges?.bagChargePaid || 0)).toLocaleString('en-IN')}</span>
                </div>
                <div className="charge-item highlight">
                  <label>Current Payable Amount:</label>
                  <span>₹{currentPayableAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rebate Input Section */}
          {!agreement.hasActiveRebate && (
            <div className="rebate-section">
              <h3>Rebate Input</h3>
              
              <div className="rebate-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Current Payable Amount</label>
                    <input
                      type="text"
                      value={`₹${currentPayableAmount.toLocaleString('en-IN')}`}
                      readOnly
                      className="readonly-input"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Rebate Type *</label>
                    <select
                      name="rebateType"
                      value={rebateForm.rebateType}
                      onChange={handleInputChange}
                    >
                      <option value="amount">Fixed Amount</option>
                      <option value="rate">Per Quintal Rate</option>
                    </select>
                  </div>
                </div>
                
                {rebateForm.rebateType === 'amount' ? (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Enter Rebate Amount *</label>
                      <input
                        type="number"
                        name="rebateAmount"
                        value={rebateForm.rebateAmount}
                        onChange={handleInputChange}
                        onWheel={preventScrollChange}
                        placeholder={placeholders.rebateAmount}
                        min="0"
                        max={currentPayableAmount}
                        step="0.01"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Enter Rebated Per Quintal Rate *</label>
                      <input
                        type="number"
                        name="rebatePerQuintalRate"
                        value={rebateForm.rebatePerQuintalRate}
                        onChange={handleInputChange}
                        onWheel={preventScrollChange}
                        placeholder={placeholders.rebatePerQuintal}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                )}
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Rebate Reason</label>
                    <textarea
                      name="rebateReason"
                      value={rebateForm.rebateReason}
                      onChange={handleInputChange}
                      placeholder={placeholders.rebateReason}
                      rows="3"
                    />
                  </div>
                </div>
                
                <div className="form-actions">
                  <button
                    onClick={handlePreviewCalculation}
                    className="btn-preview"
                    disabled={loading}
                  >
                    Preview Calculation
                  </button>
                </div>
              </div>
              
              {/* Calculation Preview */}
              {calculationPreview && (
                <div className="calculation-preview">
                  <h4>Rebate Calculation Preview</h4>
                  {/* Updated: Fixed rebate amount display - no negative sign */}
                  <div className="calculation-grid">
                    <div className="calc-item">
                      <label>Original Payable Amount:</label>
                      <span>₹{calculationPreview.originalPayableAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="calc-item highlight">
                      <label>Rebate Amount:</label>
                      <span style={{color: 'red', fontWeight: 'bold'}}>
                        -₹{calculationPreview.rebateAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="calc-item">
                      <label>Rebated Storage Charge:</label>
                      <span>₹{calculationPreview.rebatedStorageCharge.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="calc-item">
                      <label>Handling Charge:</label>
                      <span>₹{calculationPreview.handlingCharge.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="calc-item">
                      <label>Bag Charges:</label>
                      <span>₹{calculationPreview.bagCharges.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="calc-item final">
                      <label>Net Payable After Rebate:</label>
                      <span>₹{calculationPreview.netPayableAfterRebate.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  
                  <div className="form-actions">
                    <button
                      onClick={handleIssueRebate}
                      className="btn-issue-rebate"
                      disabled={loading || !canIssueRebate}
                    >
                      {loading ? 'Processing...' : 'Issue Rebate'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!agreement && !loading && (
        <div className="placeholder-message">
          <p>👆 Enter an agreement number above to begin rebate process</p>
        </div>
      )}
    </div>
  );
};

export default IssueRebate;