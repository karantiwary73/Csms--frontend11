import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './PaymentHistory.css';
import { buildApiUrl, API_ENDPOINTS } from './api';

const PaymentHistory = ({ user, token }) => {
  // Memoized placeholder values
  const placeholders = useMemo(() => ({
    name: "Enter customer name",
    mobile: "Enter mobile number"
  }), []);

  const [payments, setPayments] = useState([]);
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
  const [summary, setSummary] = useState({
    totalPayments: 0,
    totalAmount: 0,
    modeDistribution: {}
  });

  // Filter state
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    name: '',
    mobile: ''
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
    hasMore: false
  });

  // Void payment state
  const [voidModal, setVoidModal] = useState({ show: false, payment: null });
  const [voidReason, setVoidReason] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);

  const fetchPayments = useCallback(async (pageNum = 1, reset = false, searchFilters) => {
    setLoading(true);
    setSafeError('');

    try {
      // searchFilters must be provided - no fallback to avoid stale closures
      if (!searchFilters) {
        console.error('❌ fetchPayments called without searchFilters');
        return;
      }
      
      const activeFilters = {};
      if (searchFilters.fromDate) activeFilters.fromDate = searchFilters.fromDate;
      if (searchFilters.toDate) activeFilters.toDate = searchFilters.toDate;
      if (searchFilters.name) activeFilters.name = searchFilters.name;
      if (searchFilters.mobile) activeFilters.mobile = searchFilters.mobile;

      console.log('🔍 Frontend Search Debug:');
      console.log('   - Search filters:', searchFilters);
      console.log('   - Active filters being sent:', activeFilters);

      const queryParams = new URLSearchParams({
        page: pageNum,
        limit: pagination.limit,
        ...activeFilters
      });

      console.log('   - Query string:', queryParams.toString());

      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.PAYMENTS_SEARCH)}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          if (reset) {
            setPayments(result.data);
          } else {
            setPayments(prev => [...prev, ...result.data]);
          }
          setPagination(result.pagination);
          setSummary(result.summary);
        } else {
          setSafeError(result.error || 'Failed to fetch payments');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch payments' }));
        const errorMessage = typeof errorData.error === 'string' ? errorData.error : 
                           typeof errorData === 'string' ? errorData : 
                           'Failed to fetch payments';
        setSafeError(errorMessage);
      }
    } catch (err) {
      setSafeError('Error fetching payments: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [token, pagination.limit]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    if (loading) return; // Prevent multiple clicks
    console.log('🔍 Search button clicked with filters:', filters);
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchPayments(1, true, filters);
  };

  const handleReset = () => {
    if (loading) return; // Prevent multiple clicks
    
    const resetFilters = {
      fromDate: '',
      toDate: '',
      name: '',
      mobile: ''
    };
    setFilters(resetFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchPayments(1, true, resetFilters);
  };

  const handleLoadMore = () => {
    if (pagination.hasMore && !loading) {
      fetchPayments(pagination.page + 1, false);
    }
  };

  const handlePrintReceipt = async (payment) => {
    try {
      // Fetch complete receipt data from backend API
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.PAYMENTS_RECEIPT)}/${payment.paymentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const receiptData = result.data;
          
          // Print with complete receipt data
          const printWindow = window.open('', '_blank');
          printWindow.document.write(`
            <html>
              <head>
                <title>Payment Receipt - ${receiptData.receiptNumber}</title>
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
                  <tr><td><strong>Receipt Number:</strong></td><td>${receiptData.receiptNumber}</td><td><strong>Receipt Date:</strong></td><td>${new Date(receiptData.paymentDate).toLocaleDateString('en-IN')}</td></tr>
                  <tr><td><strong>Reservation Number:</strong></td><td>${receiptData.reservationNumber || '--'}</td><td><strong>Agreement Number:</strong></td><td>${receiptData.agreementNumber}</td></tr>
                  <tr><td><strong>Name:</strong></td><td>${receiptData.customerName || '--'}</td><td><strong>Village:</strong></td><td>${receiptData.village || '--'}</td></tr>
                  <tr><td><strong>S/o:</strong></td><td>${receiptData.fatherName || '--'}</td><td><strong>Post:</strong></td><td>${receiptData.post || '--'}</td></tr>
                  <tr><td><strong>Mobile:</strong></td><td>${receiptData.mobile || '--'}</td><td><strong>District:</strong></td><td>${receiptData.district || '--'}</td></tr>
                </table>
                
                <table class="details-table" style="margin-top: 20px;">
                  <tr style="background-color: #f5f5f5;">
                    <th>Product</th><th>Lot Number</th><th>Weight (Q)</th><th>Bags</th><th>Total Amount</th><th>Rebate</th><th>After Rebate</th>
                  </tr>
                  <tr>
                    <td>${receiptData.product || 'Potato Mark 40'}</td>
                    <td>${receiptData.lotNumber || '--'}</td>
                    <td>${receiptData.weight || '--'}</td>
                    <td>${receiptData.bags || '--'}</td>
                    <td>₹${(receiptData.totalCharge || 0).toLocaleString('en-IN')}</td>
                    <td>₹${(receiptData.totalRebates || 0).toLocaleString('en-IN')}</td>
                    <td>₹${((receiptData.totalCharge || 0) - (receiptData.totalRebates || 0)).toLocaleString('en-IN')}</td>
                  </tr>
                </table>
                
                <div class="amount-section">
                  <p><strong>Amount Paid: ₹${(receiptData.amountPaid || 0).toLocaleString('en-IN')} (${receiptData.paymentMode || '--'})</strong></p>
                  <p><strong>Net Remaining Due: ₹${(receiptData.remainingDue || 0).toLocaleString('en-IN')}</strong></p>
                  ${receiptData.notes ? `<p><strong>Notes:</strong> ${receiptData.notes}</p>` : ''}
                </div>
                
                <div class="signatures">
                  <div>Customer Signature</div>
                  <div>Authorized Signatory Signature<br/>${receiptData.processedBy || 'System User'}</div>
                </div>
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        } else {
          setSafeError('Failed to fetch receipt data');
        }
      } else {
        setSafeError('Failed to fetch receipt data');
      }
    } catch (error) {
      setSafeError('Error fetching receipt: ' + error.message);
    }
  };

  const handleVoidPayment = async () => {
    if (!voidReason.trim()) {
      setSafeError('Please provide a reason for voiding');
      return;
    }
    setVoidLoading(true);
    try {
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.PAYMENTS)}/${voidModal.payment.paymentId}/void`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: voidReason })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        // Update the payment in local state
        setPayments(prev => prev.map(p => 
          p._id === voidModal.payment._id 
            ? { ...p, status: 'voided', voidReason: voidReason } 
            : p
        ));
        setVoidModal({ show: false, payment: null });
        setVoidReason('');
      } else {
        setSafeError(result.error || 'Failed to void payment');
      }
    } catch (error) {
      setSafeError('Error voiding payment: ' + error.message);
    } finally {
      setVoidLoading(false);
    }
  };

  const getModeColor = (mode) => {
    const colors = {
      'Cash': '#28a745',
      'UPI': '#007bff',
      'Credit': '#ffc107',
      'Debit Card': '#17a2b8',
      'Bank Transfer': '#6f42c1',
      'Cheque': '#fd7e14',
      'Other': '#6c757d'
    };
    return colors[mode] || '#6c757d';
  };

  // Initial load
  useEffect(() => {
    fetchPayments(1, true, {
      fromDate: '',
      toDate: '',
      name: '',
      mobile: ''
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="payment-history">
      <div className="page-header">
        <h2>Payment History</h2>
        
      </div>

      {error && (
        <div className="error-message">
          ✗ {error}
        </div>
      )}

      {/* Filters */}
      <div className="form-section">
        <h3>Search Filters</h3>
        <div className="filters-form">
          <div className="filter-row">
            <div className="form-group">
              <label>From Date</label>
              <input
                type="date"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleFilterChange}
              />
            </div>
            <div className="form-group">
              <label>To Date</label>
              <input
                type="date"
                name="toDate"
                value={filters.toDate}
                onChange={handleFilterChange}
              />
            </div>
            <div className="form-group">
              <label>Customer Name</label>
              <input
                type="text"
                name="name"
                value={filters.name}
                onChange={handleFilterChange}
                placeholder={placeholders.name}
              />
            </div>
            <div className="form-group">
              <label>Mobile</label>
              <input
                type="text"
                name="mobile"
                value={filters.mobile}
                onChange={handleFilterChange}
                placeholder={placeholders.mobile}
                maxLength="10"
              />
            </div>
          </div>
          <div className="filter-actions">
            <button className="btn-search" onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button className="btn-reset" onClick={handleReset}>
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Summary Panel */}
      <div className="summary-section">
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-label">Total Payments</div>
            <div className="summary-value">{summary.totalPayments}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Amount</div>
            <div className="summary-value">₹{summary.totalAmount?.toLocaleString('en-IN') || 0}</div>
          </div>
        </div>

        {/* Payment Mode Distribution */}
        {Object.keys(summary.modeDistribution || {}).length > 0 && (
          <div className="mode-distribution">
            <h4>Payment Trends</h4>
            <div className="payment-trends">
              <div className="pie-chart-container">
                <div 
                  className="pie-chart"
                  style={{
                    background: (() => {
                      const modes = Object.entries(summary.modeDistribution);
                      const total = modes.reduce((sum, [, count]) => sum + count, 0);
                      let cumulativePercentage = 0;
                      
                      const gradientStops = modes.map(([mode, count]) => {
                        const percentage = (count / total) * 100;
                        const startPercent = cumulativePercentage;
                        cumulativePercentage += percentage;
                        const endPercent = cumulativePercentage;
                        
                        return `${getModeColor(mode)} ${startPercent}% ${endPercent}%`;
                      }).join(', ');
                      
                      return `conic-gradient(from 0deg, ${gradientStops})`;
                    })()
                  }}
                />
                <div className="pie-center">
                  <div className="pie-total">{summary.totalPayments}</div>
                  <div className="pie-label">Payments</div>
                </div>
              </div>
              <div className="mode-legend">
                {Object.entries(summary.modeDistribution)
                  .filter(([mode]) => ['Cash', 'UPI', 'Credit'].includes(mode))
                  .map(([mode, count]) => {
                    const percentage = ((count / summary.totalPayments) * 100).toFixed(1);
                    return (
                      <div key={mode} className="legend-item">
                        <div 
                          className="legend-color" 
                          style={{ backgroundColor: getModeColor(mode) }}
                        ></div>
                        <span className="legend-label">{mode}</span>
                        <span className="legend-count">{count} ({percentage}%)</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Records Table */}
      <div className="form-section">
        <h3>Payment Records</h3>
        <div className="payment-table">
          <table>
            <thead>
              <tr>
                <th>Receipt Number</th>
                <th>Date</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Lot No.</th>
                <th>Mode</th>
                <th>Total</th>
                <th>Amount Paid</th>
                <th>Due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && !loading ? (
                <tr>
                  <td colSpan="11" className="no-data">
                    <div className="no-data-content">
                      <div className="no-data-icon">📄</div>
                      <div className="no-data-text">No payment records found</div>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment._id} style={payment.status === 'voided' ? { opacity: 0.5, textDecoration: 'line-through' } : {}}>
                    <td>{payment.receiptNumber}</td>
                    <td>{new Date(payment.paymentDate).toLocaleDateString('en-IN')}</td>
                    <td>{payment.customerSnapshot?.name || '--'}</td>
                    <td>{payment.customerSnapshot?.mobile || '--'}</td>
                    <td>{payment.agreementSnapshot?.lotNumber || '--'}</td>
                    <td>
                      <span 
                        className="payment-mode-badge"
                        style={{ backgroundColor: getModeColor(payment.paymentMode) }}
                      >
                        {payment.paymentMode}
                      </span>
                    </td>
                    <td>₹{(payment.agreementSnapshot?.totalCharge || 0).toLocaleString('en-IN')}</td>
                    <td className="amount-paid">₹{payment.amountPaid.toLocaleString('en-IN')}</td>
                    <td>₹{payment.remainingDue.toLocaleString('en-IN')}</td>
                    <td>
                      {payment.status === 'voided' ? (
                        <span style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: '0.85em' }} title={payment.voidReason}>
                          Void
                        </span>
                      ) : (
                        <span style={{ color: '#388e3c', fontWeight: 'bold', fontSize: '0.85em' }}>
                          Active
                        </span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn-action"
                        onClick={() => handlePrintReceipt(payment)}
                        title="Print Receipt"
                      >
                        🖨️ Print
                      </button>
                      {user?.role === 'ADMIN' && payment.status !== 'voided' && (
                        <button 
                          className="btn-action"
                          onClick={() => setVoidModal({ show: true, payment })}
                          title="Void Payment"
                          style={{ marginLeft: '4px', color: '#d32f2f' }}
                        >
                          ✕ Void
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Load More */}
        {pagination.hasMore && (
          <div className="load-more-section">
            <button 
              className="btn-load-more" 
              onClick={handleLoadMore}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}

        {/* Pagination Info */}
        <div className="pagination-info">
          Showing {payments.length} of {pagination.total} payments
          {pagination.pages > 1 && ` (Page ${pagination.page} of ${pagination.pages})`}
        </div>
      </div>

      {/* Void Payment Modal */}
      {voidModal.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '8px', padding: '24px',
            maxWidth: '450px', width: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#d32f2f' }}>Void Payment</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.9em', color: '#666' }}>
              Receipt: <strong>{voidModal.payment?.receiptNumber}</strong> — 
              ₹{voidModal.payment?.amountPaid?.toLocaleString('en-IN')}
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.85em', color: '#888' }}>
              This will void the payment record (not delete it). The amount will be added back to dues.
            </p>
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Enter reason for voiding this payment..."
              rows={3}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', resize: 'vertical', boxSizing: 'border-box' }}
              maxLength={500}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button 
                onClick={() => { setVoidModal({ show: false, payment: null }); setVoidReason(''); }}
                style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer', backgroundColor: '#f5f5f5' }}
              >
                Cancel
              </button>
              <button
                onClick={handleVoidPayment}
                disabled={voidLoading || !voidReason.trim()}
                style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer', backgroundColor: '#d32f2f', color: 'white', fontWeight: 'bold' }}
              >
                {voidLoading ? 'Voiding...' : 'Confirm Void'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;