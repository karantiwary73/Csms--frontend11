import React, { useState, useMemo } from 'react';
import './AcceptNewPayment.css';
import { buildApiUrl, API_ENDPOINTS } from './api';
import { preventScrollChange } from './inputUtils';

const AcceptNewPayment = ({ user, token }) => {
  // Memoized placeholder values
  const placeholders = useMemo(() => ({
    agreementNumber: "Enter agreement number",
    paymentAmount: "0.00",
    notes: "Optional notes"
  }), []);

  const [searchNumber, setSearchNumber] = useState('');
  const [agreement, setAgreement] = useState(null);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [relatedAgreements, setRelatedAgreements] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
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
  const [success, setSuccess] = useState('');

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    paymentMode: '',
    amountToPay: '',
    notes: ''
  });

  // Receipt state
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Rebate state
  const [showRebateForm, setShowRebateForm] = useState(false);
  const [rebateForm, setRebateForm] = useState({
    rebateType: 'amount',
    rebateAmount: '',
    rebatePerQuintalRate: '',
    rebateReason: ''
  });
  const [rebateLoading, setRebateLoading] = useState(false);

  const paymentModes = ['Cash', 'UPI', 'Credit', 'Debit Card', 'Bank Transfer', 'Cheque', 'Other'];

  const handleSearch = async () => {
    if (!searchNumber.trim()) {
      setSafeError('Please enter an agreement number');
      return;
    }

    setLoading(true);
    setSafeError('');
    setAgreement(null);
    setPaymentSummary(null);

    try {
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.PAYMENTS_AGREEMENT)}/${searchNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('🔍 Frontend Debug - Received data:', result.data);
          console.log('🔍 Frontend Debug - Agreement:', result.data.agreement);
          console.log('🔍 Frontend Debug - Reservation:', result.data.agreement?.reservationId);
          console.log('🔍 Frontend Debug - Customer:', result.data.agreement?.reservationId?.customerId);
          
          setAgreement(result.data.agreement);
          setPaymentSummary({
            totalCharge: result.data.totalCharge,
            totalRebates: result.data.totalRebates,
            totalPayments: result.data.totalPayments,
            currentDue: result.data.currentDue
          });
          setRelatedAgreements(result.data.relatedAgreements || []);
          setPaymentHistory(result.data.paymentHistory || []);
          
          // Pre-fill current due in payment form
          setPaymentForm(prev => ({
            ...prev,
            amountToPay: result.data.currentDue.toString()
          }));
        } else {
          setSafeError(result.error || 'Failed to fetch agreement');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Agreement not found' }));
        const errorMessage = typeof errorData.error === 'string' ? errorData.error : 
                           typeof errorData === 'string' ? errorData : 
                           'Agreement not found';
        setSafeError(errorMessage);
      }
    } catch (err) {
      setSafeError('Error searching agreement: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm(prev => ({ ...prev, [name]: value }));
  };

  // Memoized remaining due calculation
  const remainingDue = useMemo(() => {
    const amountToPay = parseFloat(paymentForm.amountToPay) || 0;
    const currentDue = paymentSummary?.currentDue || 0;
    return Math.max(0, currentDue - amountToPay);
  }, [paymentForm.amountToPay, paymentSummary]);

  const isPaymentValid = () => {
    const amountToPay = parseFloat(paymentForm.amountToPay) || 0;
    const currentDue = paymentSummary?.currentDue || 0;
    
    return agreement && 
           paymentForm.paymentMode && 
           amountToPay > 0 && 
           amountToPay <= currentDue;
  };

  const handleAcceptPayment = async () => {
    if (!isPaymentValid()) {
      setSafeError('Please check payment details');
      return;
    }

    setLoading(true);
    setSafeError('');

    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.PAYMENTS_PROCESS), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agreementId: agreement._id,
          paymentMode: paymentForm.paymentMode,
          amountPaid: parseFloat(paymentForm.amountToPay),
          notes: paymentForm.notes
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSuccess('Payment processed successfully!');
          
          // Use the receipt data as-is without fetching additional payment history
          // Payment history should only be shown in withdrawal receipts
          setReceiptData(result.data.receiptData);
          setShowReceipt(true);
          
          // Reset form
          setPaymentForm({
            paymentMode: '',
            amountToPay: '',
            notes: ''
          });
          
          // Refresh agreement data
          handleSearch();
        } else {
          setSafeError(result.error || 'Failed to process payment');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Payment processing failed' }));
        const errorMessage = typeof errorData.error === 'string' ? errorData.error : 
                           typeof errorData === 'string' ? errorData : 
                           'Payment processing failed';
        setSafeError(errorMessage);
      }
    } catch (err) {
      setSafeError('Error processing payment: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    if (receiptData) {
      // Ensure all required fields have safe fallbacks
      const safeReceiptData = {
        receiptNumber: receiptData.receiptNumber || '--',
        paymentDate: receiptData.paymentDate || new Date(),
        agreementNumber: receiptData.agreementNumber || '--',
        reservationNumber: receiptData.reservationNumber || '--',
        customerName: receiptData.customerName || '--',
        fatherName: receiptData.fatherName || '--',
        mobile: receiptData.mobile || '--',
        village: receiptData.village || '--',
        post: receiptData.post || '--',
        district: receiptData.district || '--',
        lotNumber: receiptData.lotNumber || '--',
        product: receiptData.product || 'Potato Mark 40',
        weight: receiptData.weight || '--',
        bags: receiptData.bags || '--',
        totalCharge: receiptData.totalCharge || 0,
        totalRebates: receiptData.totalRebates || 0,
        amountPaid: receiptData.amountPaid || 0,
        remainingDue: receiptData.remainingDue || 0,
        paymentMode: receiptData.paymentMode || '--',
        processedBy: receiptData.processedBy || 'System User'
      };

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Payment Receipt - ${safeReceiptData.receiptNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .company-name { font-size: 24px; font-weight: bold; }
              .company-details { font-size: 14px; margin: 5px 0; }
              .receipt-title { font-size: 18px; font-weight: bold; margin: 20px 0; }
              .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              .details-table td, .details-table th { padding: 8px; border: 1px solid #ddd; }
              .details-table th { background-color: #f5f5f5; font-weight: bold; text-align: center; }
              .amount-section { margin: 20px 0; font-size: 16px; }
              .signatures { margin-top: 50px; display: flex; justify-content: space-between; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-name">MANI COLD STORAGE PVT. LTD.</div>
              <div class="company-details">Mahmada, Pusa, Samastipur | Bihar - 843121</div>
              <div class="company-details">Contact Number: +91 99733 55535</div>
              <div class="receipt-title">PAYMENT RECEIPT</div>
            </div>
            
            <table class="details-table">
              <tr><td><strong>Receipt Number:</strong></td><td>${safeReceiptData.receiptNumber}</td><td><strong>Receipt Date:</strong></td><td>${new Date(safeReceiptData.paymentDate).toLocaleDateString('en-IN')}</td></tr>
              <tr><td><strong>Reservation Number:</strong></td><td>${safeReceiptData.reservationNumber}</td><td><strong>Agreement Number:</strong></td><td>${safeReceiptData.agreementNumber}</td></tr>
              <tr><td><strong>Name:</strong></td><td>${safeReceiptData.customerName}</td><td><strong>Village:</strong></td><td>${safeReceiptData.village}</td></tr>
              <tr><td><strong>S/o:</strong></td><td>${safeReceiptData.fatherName}</td><td><strong>Post:</strong></td><td>${safeReceiptData.post}</td></tr>
              <tr><td><strong>Mobile:</strong></td><td>${safeReceiptData.mobile}</td><td><strong>District:</strong></td><td>${safeReceiptData.district}</td></tr>
            </table>
            
            <table class="details-table" style="margin-top: 20px;">
              <tr style="background-color: #f5f5f5;">
                <th>Product</th><th>Lot Number</th><th>Weight (Q)</th><th>Bags</th><th>Total Amount</th><th>Rebate</th><th>After Rebate</th>
              </tr>
              <tr>
                <td>${safeReceiptData.product}</td>
                <td>${safeReceiptData.lotNumber}</td>
                <td>${safeReceiptData.weight}</td>
                <td>${safeReceiptData.bags}</td>
                <td>₹${safeReceiptData.totalCharge.toLocaleString('en-IN')}</td>
                <td>₹${safeReceiptData.totalRebates.toLocaleString('en-IN')}</td>
                <td>₹${(safeReceiptData.totalCharge - safeReceiptData.totalRebates).toLocaleString('en-IN')}</td>
              </tr>
            </table>
            
            <div class="amount-section">
              <p><strong>Amount Paid: ₹${safeReceiptData.amountPaid.toLocaleString('en-IN')} (${safeReceiptData.paymentMode})</strong></p>
              <p><strong>Net Remaining Due: ₹${safeReceiptData.remainingDue.toLocaleString('en-IN')}</strong></p>
            </div>
            
            <div class="signatures">
              <div>Customer Signature</div>
              <div>Authorized Signatory Signature<br/>${safeReceiptData.processedBy}</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Rebate handlers
  const handleRebateInputChange = (e) => {
    const { name, value } = e.target;
    setRebateForm(prev => ({ ...prev, [name]: value }));
  };

  // Memoized rebate preview calculation
  const rebatePreview = useMemo(() => {
    if (!agreement) return null;

    const { rebateType, rebateAmount, rebatePerQuintalRate } = rebateForm;
    
    if (rebateType === 'amount') {
      const amount = parseFloat(rebateAmount) || 0;
      const newDueAmount = Math.max(0, (paymentSummary?.currentDue || 0) - amount);
      return {
        rebateAmount: amount,
        newDue: newDueAmount
      };
    } else {
      // For 'rate' type: rebatePerQuintalRate is the NEW rate per quintal (not the discount)
      const newRatePerQuintal = parseFloat(rebatePerQuintalRate) || 0;
      const weight = agreement.weightInQuintal || 0;
      const newTotal = newRatePerQuintal * weight;  // New total after applying new rate
      const discountAmount = Math.max(0, (paymentSummary?.currentDue || 0) - newTotal);  // Discount is the difference
      return {
        rebateAmount: discountAmount,  // The discount amount
        newDue: newTotal  // The new total due
      };
    }
  }, [agreement, rebateForm, paymentSummary]);

  const isRebateValid = () => {
    const { rebateType, rebateAmount, rebatePerQuintalRate } = rebateForm;
    
    if (rebateType === 'amount') {
      const amount = parseFloat(rebateAmount) || 0;
      return amount > 0 && amount <= (paymentSummary?.currentDue || 0);
    } else {
      const rate = parseFloat(rebatePerQuintalRate) || 0;
      return rate > 0;
    }
  };

  const handleIssueRebate = async () => {
    if (!isRebateValid()) {
      setSafeError('Please enter valid rebate details');
      return;
    }

    setRebateLoading(true);
    setSafeError('');

    try {
      const { rebateType, rebateAmount, rebatePerQuintalRate, rebateReason } = rebateForm;
      
      const response = await fetch(buildApiUrl(API_ENDPOINTS.REBATES_ISSUE), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agreementId: agreement._id,
          rebateType,
          rebateAmount: rebateType === 'amount' ? parseFloat(rebateAmount) : undefined,
          rebatePerQuintalRate: rebateType === 'rate' ? parseFloat(rebatePerQuintalRate) : undefined,
          rebateReason: rebateReason || 'Instant rebate issued during payment'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSuccess('Rebate issued successfully!');
          setShowRebateForm(false);
          setRebateForm({
            rebateType: 'amount',
            rebateAmount: '',
            rebatePerQuintalRate: '',
            rebateReason: ''
          });
          
          // Refresh agreement data
          handleSearch();
        } else {
          setSafeError(result.error || 'Failed to issue rebate');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Rebate issuance failed' }));
        setSafeError(errorData.error || 'Rebate issuance failed');
      }
    } catch (err) {
      setSafeError('Error issuing rebate: ' + err.message);
    } finally {
      setRebateLoading(false);
    }
  };

  const canIssueRebate = () => {
    return agreement && (paymentSummary?.totalRebates || 0) === 0;
  };

  return (
    <div className="accept-payment">
      <div className="page-header">
        <h2>Accept New Payment</h2>
        <p>Record payments received against existing agreements</p>
      </div>

      {error && (
        <div className="error-message">
          ✗ {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          ✓ {success}
        </div>
      )}

      {/* Search Agreement */}
      <div className="form-section">
        <h3>1. Search Agreement</h3>
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
            className="btn-continue"
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Continue'}
          </button>
        </div>
      </div>

      {/* Agreement Information */}
      {agreement && (
        <div className="form-section">
          <h3>2. Agreement Information (Read-only)</h3>
          <div className="agreement-info">
            <div className="info-grid">
              <div className="info-item">
                <label>Name:</label>
                <span>{agreement.reservationId?.customerId?.customerName || '--'}</span>
              </div>
              <div className="info-item">
                <label>Father's Name:</label>
                <span>{agreement.reservationId?.customerId?.fatherName || '--'}</span>
              </div>
              <div className="info-item">
                <label>Mobile:</label>
                <span>{agreement.reservationId?.customerId?.mobile || '--'}</span>
              </div>
              <div className="info-item">
                <label>Address Line 1:</label>
                <span>{agreement.reservationId?.customerId?.addressLine1 || '--'}</span>
              </div>
              <div className="info-item">
                <label>Address Line 2:</label>
                <span>{agreement.reservationId?.customerId?.addressLine2 || '--'}</span>
              </div>
              <div className="info-item">
                <label>City:</label>
                <span>{agreement.reservationId?.customerId?.city || '--'}</span>
              </div>
              <div className="info-item">
                <label>District:</label>
                <span>{agreement.reservationId?.customerId?.district || '--'}</span>
              </div>
              <div className="info-item">
                <label>Agreement Number:</label>
                <span>{agreement.agreementId}</span>
              </div>
              <div className="info-item">
                <label>Reservation Number:</label>
                <span>{agreement.reservationId?.reservationNumber || '--'}</span>
              </div>
              <div className="info-item">
                <label>Lot Number:</label>
                <span>{agreement.lotNumber}</span>
              </div>
              <div className="info-item">
                <label>Weight:</label>
                <span>{agreement.weightInQuintal} Q</span>
              </div>
              <div className="info-item">
                <label>Number of Bags:</label>
                <span>{agreement.numberOfBags}</span>
              </div>
              <div className="info-item">
                <label>Reservation Fee:</label>
                <span>₹{agreement.reservationId?.reservationFee?.toLocaleString('en-IN') || 0}</span>
              </div>
              <div className="info-item">
                <label>Total Charge:</label>
                <span>₹{paymentSummary?.totalCharge?.toLocaleString('en-IN') || 0}</span>
              </div>
              <div className="info-item">
                <label>Advance Paid:</label>
                <span>₹{agreement.charges?.advanceStorageChargesPaid?.toLocaleString('en-IN') || 0}</span>
              </div>
              <div className="info-item highlight">
                <label>Dues after rebate:</label>
                <span>₹{paymentSummary?.currentDue?.toLocaleString('en-IN') || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Related Agreements */}
      {relatedAgreements.length > 0 && (
        <div className="form-section">
          <h3>3. Agreements Against This Reservation</h3>
          <div className="related-agreements-table">
            <table>
              <thead>
                <tr>
                  <th>Agreement Number</th>
                  <th>Lot Number</th>
                  <th>Weight</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {relatedAgreements.map((relAgreement, index) => (
                  <tr key={index}>
                    <td>{relAgreement.agreementId}</td>
                    <td>{relAgreement.lotNumber}</td>
                    <td>{relAgreement.weightInQuintal} Q</td>
                    <td>₹{((relAgreement.charges?.handlingChargeTotal || 0) + 
                            (relAgreement.charges?.bagChargeTotal || 0) + 
                            (relAgreement.charges?.totalStorageCharge || 0)).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Accept Payment Section */}
      {agreement && (
        <div className="form-section">
          <h3>4. Accept Payment Section</h3>
          <div className="payment-form">
            <div className="form-row">
              <div className="form-group">
                <label>Dues on this agreement (auto-filled, read-only)</label>
                <input
                  type="text"
                  value={`₹${paymentSummary?.currentDue?.toLocaleString('en-IN') || 0}`}
                  readOnly
                  className="readonly-input"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Payment Mode *</label>
                <select
                  name="paymentMode"
                  value={paymentForm.paymentMode}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Payment Mode</option>
                  {paymentModes.map(mode => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Enter Amount to Pay *</label>
                <input
                  type="number"
                  name="amountToPay"
                  value={paymentForm.amountToPay}
                  onChange={handleInputChange}
                  onWheel={preventScrollChange}
                  placeholder={placeholders.paymentAmount}
                  min="0"
                  max={paymentSummary?.currentDue || 0}
                  step="0.01"
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Remaining Due (auto-calculated)</label>
                <input
                  type="text"
                  value={`₹${remainingDue.toLocaleString('en-IN')}`}
                  readOnly
                  className="readonly-input"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea
                  name="notes"
                  value={paymentForm.notes}
                  onChange={handleInputChange}
                  placeholder={placeholders.notes}
                  rows="3"
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button
                onClick={handleAcceptPayment}
                className="btn-accept-payment"
                disabled={!isPaymentValid() || loading}
              >
                {loading ? 'Processing...' : 'Accept Payment'}
              </button>
              
              {canIssueRebate() && (
                <button
                  onClick={() => setShowRebateForm(!showRebateForm)}
                  className="btn-issue-rebate"
                  type="button"
                >
                  {showRebateForm ? 'Cancel Rebate' : '💰 Issue Rebate'}
                </button>
              )}
            </div>
          </div>

          {/* Rebate Form (shown when button clicked and no rebate issued yet) */}
          {showRebateForm && canIssueRebate() && (
            <div className="rebate-form-section">
              <h4>Issue Instant Rebate</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Rebate Type *</label>
                  <select
                    name="rebateType"
                    value={rebateForm.rebateType}
                    onChange={handleRebateInputChange}
                  >
                    <option value="amount">Fixed Amount</option>
                    <option value="rate">Per Quintal Rate</option>
                  </select>
                </div>
              </div>

              {rebateForm.rebateType === 'amount' ? (
                <div className="form-row">
                  <div className="form-group">
                    <label>Rebate Amount (₹) *</label>
                    <input
                      type="number"
                      name="rebateAmount"
                      value={rebateForm.rebateAmount}
                      onChange={handleRebateInputChange}
                      onWheel={preventScrollChange}
                      placeholder="Enter rebate amount"
                      min="0"
                      max={paymentSummary?.currentDue || 0}
                      step="0.01"
                    />
                  </div>
                </div>
              ) : (
                <div className="form-row">
                  <div className="form-group">
                    <label>Rebate Per Quintal (₹/Q) *</label>
                    <input
                      type="number"
                      name="rebatePerQuintalRate"
                      value={rebateForm.rebatePerQuintalRate}
                      onChange={handleRebateInputChange}
                      onWheel={preventScrollChange}
                      placeholder="Enter rate per quintal"
                      min="0"
                      step="0.01"
                    />
                    <small>Weight: {agreement?.weightInQuintal || 0} quintals</small>
                  </div>
                </div>
              )}

              {rebatePreview && (
                <div className="rebate-preview">
                  <p><strong>Rebate Amount:</strong> ₹{rebatePreview.rebateAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  <p><strong>New Due After Rebate:</strong> ₹{rebatePreview.newDue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Rebate Reason (optional)</label>
                  <textarea
                    name="rebateReason"
                    value={rebateForm.rebateReason}
                    onChange={handleRebateInputChange}
                    placeholder="Enter reason for rebate"
                    rows="2"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  onClick={handleIssueRebate}
                  className="btn-confirm-rebate"
                  disabled={!isRebateValid() || rebateLoading}
                >
                  {rebateLoading ? 'Issuing...' : 'Confirm Rebate'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <div className="form-section">
          <h3>5. Payments Against This Agreement</h3>
          <div className="payment-history-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Receipt Number</th>
                  <th>Amount Paid</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment, index) => (
                  <tr key={index} style={payment.status === 'voided' ? { opacity: 0.5, textDecoration: 'line-through' } : {}}>
                    <td>{new Date(payment.paymentDate).toLocaleDateString('en-IN')}</td>
                    <td>{payment.receiptNumber}</td>
                    <td>₹{payment.amountPaid.toLocaleString('en-IN')}</td>
                    <td>{payment.paymentMode}</td>
                    <td>
                      {payment.status === 'voided' ? (
                        <span style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: '0.85em' }} title={payment.voidReason}>Void</span>
                      ) : (
                        <span style={{ color: '#388e3c', fontWeight: 'bold', fontSize: '0.85em' }}>Active</span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn-action"
                        onClick={async () => {
                          try {
                            // Fetch complete receipt data from backend
                            const response = await fetch(`${buildApiUrl(API_ENDPOINTS.PAYMENTS_RECEIPT)}/${payment.paymentId}`, {
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              }
                            });

                            if (response.ok) {
                              const result = await response.json();
                              if (result.success) {
                                setReceiptData(result.data);
                                handlePrintReceipt();
                              } else {
                                setSafeError('Failed to fetch receipt data');
                              }
                            } else {
                              setSafeError('Failed to fetch receipt data');
                            }
                          } catch (error) {
                            setSafeError('Error fetching receipt: ' + error.message);
                          }
                        }}
                        title="Print Receipt"
                      >
                        🖨️ Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <div className="receipt-modal">
          <div className="receipt-content">
            <div className="receipt-header">
              <h3>Payment Successful!</h3>
              <button 
                className="btn-close"
                onClick={() => setShowReceipt(false)}
              >
                ✕
              </button>
            </div>
            <div className="receipt-details">
              <p><strong>Receipt Number:</strong> {receiptData.receiptNumber}</p>
              <p><strong>Amount Paid:</strong> ₹{receiptData.amountPaid.toLocaleString('en-IN')}</p>
              <p><strong>Payment Mode:</strong> {receiptData.paymentMode}</p>
              <p><strong>Remaining Due:</strong> ₹{receiptData.remainingDue.toLocaleString('en-IN')}</p>
            </div>
            <div className="receipt-actions">
              <button 
                onClick={handlePrintReceipt}
                className="btn-print-receipt"
              >
                🖨️ Print Receipt
              </button>
              <button 
                onClick={() => setShowReceipt(false)}
                className="btn-close-receipt"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcceptNewPayment;