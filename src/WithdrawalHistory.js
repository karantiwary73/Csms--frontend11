import React, { useState, useEffect, useRef, useMemo } from 'react';
import './WithdrawalHistory.css';
import { buildApiUrl, API_ENDPOINTS } from './api';

const WithdrawalHistory = ({ user, token }) => {
  const placeholders = useMemo(() => ({
    agreementNumber: "Enter agreement number",
    withdrawalDate: "Select date"
  }), []);

  const [filters, setFilters] = useState({
    agreementNumber: '',
    withdrawalDate: ''
  });

  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const [withdrawals, setWithdrawals] = useState([]);
  const [summary, setSummary] = useState({
    todayWithdrawal: 0,
    totalWithdrawal: 0,
    totalRemaining: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    hasMore: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summaryLocked, setSummaryLocked] = useState(false);

  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    fetchWithdrawals(1, true);
  }, []);

  const fetchWithdrawals = async (page = 1, resetSummary = false, forceEmpty = false) => {
    setLoading(true);
    setError('');

    try {
      const queryParams = new URLSearchParams();
      
      const currentFilters = forceEmpty ? {} : filtersRef.current;
      
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value && value.trim()) {
          queryParams.append(key, value.trim());
        }
      });

      queryParams.append('page', page.toString());
      queryParams.append('limit', pagination.limit.toString());

      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.WITHDRAWALS_HISTORY)}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch withdrawals');
      }

      if (page === 1) {
        setWithdrawals(result.data);
        if (resetSummary || !summaryLocked) {
          setSummary(result.summary);
          setSummaryLocked(true);
        }
      } else {
        setWithdrawals(prev => [...prev, ...result.data]);
      }

      setPagination(result.pagination);

    } catch (err) {
      console.error('Fetch withdrawals error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = () => {
    if (loading) return;
    setSummaryLocked(false);
    fetchWithdrawals(1, true);
  };

  const handleReset = () => {
    if (loading) return;
    
    const emptyFilters = {
      agreementNumber: '',
      withdrawalDate: ''
    };
    
    setFilters(emptyFilters);
    filtersRef.current = emptyFilters;
    
    setWithdrawals([]);
    setSummaryLocked(false);
    
    setPagination({
      page: 1,
      limit: 100,
      total: 0,
      hasMore: false
    });
    
    fetchWithdrawals(1, true, true);
  };

  const loadMore = () => {
    if (pagination.hasMore && !loading) {
      fetchWithdrawals(pagination.page + 1, false);
    }
  };

  const handlePrintWithdrawal = async (withdrawal) => {
    // Fetch payment and rebate data for the agreement
    let paymentData = [];
    let rebateData = [];
    // Calculate the FULL total charge: Storage Charge + Bag Charges + Handling Charges
    const totalStorageCharge = withdrawal.agreementId?.charges?.totalStorageCharge || 0;
    const bagCharges = withdrawal.agreementId?.charges?.bagChargeTotal || 0;
    const handlingCharges = withdrawal.agreementId?.charges?.handlingChargeTotal || 0;
    const totalCharge = totalStorageCharge + bagCharges + handlingCharges;
    let totalRebates = 0;
    let totalPaid = 0;
    let netDue = totalCharge;
    
    try {
      // Fetch payments
      const paymentResponse = await fetch(
        `${buildApiUrl(API_ENDPOINTS.PAYMENTS_SEARCH)}?agreementNumber=${withdrawal.agreementId?.agreementId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (paymentResponse.ok) {
        const paymentResult = await paymentResponse.json();
        
        if (paymentResult.success && paymentResult.data && paymentResult.data.length > 0) {
          paymentData = paymentResult.data;
          
          // Calculate total paid from all payments
          totalPaid = paymentData.reduce((sum, payment) => {
            return sum + (payment.amountPaid || 0);
          }, 0);
        }
      }
      
      // Fetch rebates
      const rebateResponse = await fetch(
        `${buildApiUrl(API_ENDPOINTS.REBATES_SEARCH)}?agreementNumber=${withdrawal.agreementId?.agreementId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (rebateResponse.ok) {
        const rebateResult = await rebateResponse.json();
        
        if (rebateResult.success && rebateResult.data && rebateResult.data.length > 0) {
          rebateData = rebateResult.data;
          
          // Calculate total rebates
          totalRebates = rebateData.reduce((sum, rebate) => {
            return sum + (rebate.rebateAmount || 0);
          }, 0);
        }
      }
      
      // Calculate net due: Total Charge - Total Rebates - Total Paid
      netDue = totalCharge - totalRebates - totalPaid;
      
    } catch (err) {
      console.error('Error fetching payment/rebate data:', err);
    }
    
    // Ensure netDue is never negative or NaN
    if (isNaN(netDue) || netDue === null || netDue === undefined) {
      netDue = totalCharge;
    }
    netDue = Math.max(0, netDue);
    
    const receipt = {
      withdrawalId: withdrawal.withdrawalId,
      withdrawalDate: withdrawal.createdOn,
      dispatchDate: withdrawal.dispatchDate,
      agreementNumber: withdrawal.agreementId?.agreementId || '--',
      reservationNumber: withdrawal.agreementId?.reservationId?.reservationNumber || '--',
      lotNumber: withdrawal.lotNumber,
      customerName: withdrawal.agreementId?.reservationId?.customerId?.customerName || '--',
      fatherName: withdrawal.agreementId?.reservationId?.customerId?.fatherName || '--',
      mobile: withdrawal.agreementId?.reservationId?.customerId?.mobile || '--',
      village: withdrawal.agreementId?.reservationId?.customerId?.addressLine1 || '--',
      post: withdrawal.agreementId?.reservationId?.customerId?.addressLine2 || '--',
      district: withdrawal.agreementId?.reservationId?.customerId?.district || '--',
      product: 'Potato Mark 40',
      weight: withdrawal.agreementId?.weightInQuintal || 0,
      totalBags: withdrawal.agreementId?.numberOfBags || 0,
      bagsWithdrawn: withdrawal.bagsWithdrawn,
      bagsRemaining: withdrawal.bagsRemaining,
      totalCharge: totalCharge,
      rebate: totalRebates,
      afterRebate: totalCharge - totalRebates,
      netDue: netDue,
      paymentHistory: paymentData,
      createdBy: withdrawal.createdBy || 'System User'
    };
    
    console.log('📋 Withdrawal receipt data:', {
      totalCharge: receipt.totalCharge,
      rebate: receipt.rebate,
      afterRebate: receipt.afterRebate,
      netDue: receipt.netDue,
      paymentCount: receipt.paymentHistory.length
    });
    
    setReceiptData(receipt);
    handlePrintReceipt(receipt);
  };

  const handlePrintReceipt = (receipt) => {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Withdrawal Receipt - ${receipt.withdrawalId}</title>
            <style>
              @page { margin: 0.4in; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 0; font-size: 11px; }
              .page { padding: 15px; }
              .header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 8px; }
              .company-name { font-size: 18px; font-weight: bold; margin: 0 0 4px 0; }
              .company-details { font-size: 11px; margin: 2px 0; }
              .receipt-title { font-size: 16px; font-weight: bold; margin: 12px 0; text-align: center; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 6px 0; }
              .details-table { width: 100%; margin: 10px 0; font-size: 11px; }
              .details-table td { padding: 5px; vertical-align: top; }
              .details-table td:first-child { font-weight: bold; width: 25%; }
              .details-table td:nth-child(2) { width: 25%; }
              .details-table td:nth-child(3) { font-weight: bold; width: 25%; }
              .details-table td:nth-child(4) { width: 25%; }
              .product-table { width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid #000; font-size: 10px; }
              .product-table th, .product-table td { padding: 6px; text-align: center; border: 1px solid #000; }
              .product-table th { font-weight: bold; background: #f0f0f0; }
              .net-due { font-size: 16px; font-weight: bold; margin: 12px 0; text-align: center; }
              .payment-history { margin: 10px 0; font-size: 10px; }
              .payment-history strong { font-size: 11px; display: block; margin-bottom: 4px; }
              .payment-history table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 9px; }
              .payment-history th, .payment-history td { padding: 4px; text-align: center; border: 1px solid #000; }
              .payment-history th { background-color: #f0f0f0; font-weight: bold; }
              .signatures { margin-top: 20px; display: flex; justify-content: space-between; font-size: 10px; }
              .signature-box { text-align: center; }
              .separator { border-top: 2px dashed #000; margin: 15px 0; }
              .gate-pass-title { font-size: 16px; font-weight: bold; text-align: center; margin: 10px 0; }
              .gate-pass-info { font-size: 11px; margin: 6px 0; }
              .gate-pass-info strong { display: inline-block; width: 120px; }
              .bags-allowed { font-size: 20px; font-weight: bold; margin: 15px 0; text-align: center; }
              @media print { 
                body { margin: 0; }
                .page { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="page">
              <div class="header">
                <div class="company-name">MANI COLD STORAGE PVT. LTD.</div>
                <div class="company-details">Mahmada, Pusa, Samastipur | Bihar - 843121 | +91 99733 55535</div>
              </div>

              <div class="receipt-title">WITHDRAWAL RECEIPT</div>

              <table class="details-table">
                <tr>
                  <td>Res No:</td>
                  <td>${receipt.reservationNumber}</td>
                  <td>Agr No:</td>
                  <td>${receipt.agreementNumber}</td>
                </tr>
                <tr>
                  <td>Name:</td>
                  <td>${receipt.customerName}</td>
                  <td>Village:</td>
                  <td>${receipt.village}</td>
                </tr>
                <tr>
                  <td>S/o:</td>
                  <td>${receipt.fatherName}</td>
                  <td>Post:</td>
                  <td>${receipt.post}</td>
                </tr>
                <tr>
                  <td>Mobile:</td>
                  <td>${receipt.mobile}</td>
                  <td>District:</td>
                  <td>${receipt.district}</td>
                </tr>
              </table>

              <table class="product-table">
                <tr>
                  <th>Product</th>
                  <th>Lot</th>
                  <th>Wt(Q)</th>
                  <th>Bags</th>
                  <th>Total</th>
                  <th>Rebate</th>
                  <th>After Rebate</th>
                </tr>
                <tr>
                  <td>${receipt.product}</td>
                  <td>${receipt.lotNumber}</td>
                  <td>${receipt.weight}</td>
                  <td>${receipt.totalBags}</td>
                  <td>₹${receipt.totalCharge.toLocaleString('en-IN')}</td>
                  <td>${receipt.rebate}</td>
                  <td>₹${receipt.afterRebate.toLocaleString('en-IN')}</td>
                </tr>
              </table>

              <div class="net-due">Net Due: ₹${(receipt.netDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>

              <div class="payment-history">
                <strong>Payment History:</strong>
                <table>
                  <tr>
                    <th>Receipt</th>
                    <th>Date</th>
                    <th>Due</th>
                    <th>Mode</th>
                    <th>Paid</th>
                    <th>Balance</th>
                  </tr>
                  ${receipt.paymentHistory && receipt.paymentHistory.length > 0 
                    ? (() => {
                        const sortedPayments = [...receipt.paymentHistory].sort((a, b) => 
                          new Date(a.paymentDate) - new Date(b.paymentDate)
                        );

                        let runningDue = receipt.afterRebate;
                        return sortedPayments.map(payment => {
                          const totalDueBefore = runningDue;
                          const netDueAfter = Math.max(0, runningDue - (payment.amountPaid || 0));
                          runningDue = netDueAfter;
                          return `
                            <tr>
                              <td>${payment.receiptNumber || '--'}</td>
                              <td>${new Date(payment.paymentDate).toLocaleDateString('en-IN')}</td>
                              <td>₹${totalDueBefore.toLocaleString('en-IN')}</td>
                              <td>${payment.paymentMode || '--'}</td>
                              <td>₹${(payment.amountPaid || 0).toLocaleString('en-IN')}</td>
                              <td>₹${netDueAfter.toLocaleString('en-IN')}</td>
                            </tr>
                          `;
                        }).join('');
                      })()
                    : '<tr><td colspan="6" style="text-align: center; padding: 4px;">No payments</td></tr>'
                  }
                </table>
              </div>

              <div class="signatures">
                <div class="signature-box">Customer Signature</div>
                <div class="signature-box">
                  Authorized Signatory Signature<br/>
                  ${receipt.createdBy}
                </div>
              </div>

              <div class="separator"></div>

              <div class="gate-pass-title">GATE PASS</div>

              <div style="margin: 4px 0;">
                <div class="gate-pass-info">
                  <strong>Withdrawal:</strong> ${receipt.withdrawalId}
                  <span style="float: right;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</span>
                </div>
                <div class="gate-pass-info">
                  <strong>Agreement:</strong> ${receipt.agreementNumber}
                  <span style="float: right;"><strong>Lot:</strong> ${receipt.lotNumber}</span>
                </div>
              </div>

              <div class="bags-allowed">
                ${receipt.bagsWithdrawn} Bags | ${new Date(receipt.dispatchDate).toLocaleDateString('en-IN')}
              </div>

              <div class="signatures">
                <div class="signature-box">Customer Signature</div>
                <div class="signature-box">
                  Authorized Signatory Signature<br/>
                  ${receipt.createdBy}
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }

  return (
    <div className="withdrawal-history">
      <div className="page-header">
        <h2>Withdrawal History</h2>
        <p>View and search historical withdrawal transactions</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Search Section */}
      <div className="search-section">
        <h3>Search / Filter</h3>
        <div className="search-grid">
          <div className="form-group">
            <label>Agreement Number</label>
            <input
              type="text"
              name="agreementNumber"
              value={filters.agreementNumber}
              onChange={handleFilterChange}
              placeholder={placeholders.agreementNumber}
            />
          </div>

          <div className="form-group">
            <label>Withdrawal Date</label>
            <input
              type="date"
              name="withdrawalDate"
              value={filters.withdrawalDate}
              onChange={handleFilterChange}
            />
          </div>
        </div>

        <div className="search-actions">
          <button onClick={handleSearch} disabled={loading} className="search-button">
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button onClick={handleReset} disabled={loading} className="reset-button">
            Reset
          </button>
        </div>
      </div>

      {/* Summary Section */}
      <div className="summary-section">
        <h3>Summary Statistics</h3>
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-label">Today Withdrawal</div>
            <div className="summary-value">{summary.todayWithdrawal.toLocaleString()} bags</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Withdrawal</div>
            <div className="summary-value">{summary.totalWithdrawal.toLocaleString()} bags</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Remaining</div>
            <div className="summary-value">{summary.totalRemaining.toLocaleString()} bags</div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="results-section">
        <h3>Withdrawal Records ({pagination.total} total)</h3>
        
        <div className="table-container">
          <table className="results-table">
            <thead>
              <tr>
                <th>Withdrawal Date</th>
                <th>Withdrawal ID</th>
                <th>Agreement Number</th>
                <th>Lot Number</th>
                <th>Vendor Name</th>
                <th>Total Bags</th>
                <th>Bags Withdrawn</th>
                <th>Bags Remaining</th>
                <th>Dispatch Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 && !loading ? (
                <tr>
                  <td colSpan="10" className="no-data">No withdrawal records found</td>
                </tr>
              ) : (
                withdrawals.map((withdrawal, index) => (
                  <tr key={index}>
                    <td>{new Date(withdrawal.createdOn).toLocaleDateString('en-IN')}</td>
                    <td>{withdrawal.withdrawalId}</td>
                    <td>{withdrawal.agreementId?.agreementId || '--'}</td>
                    <td>{withdrawal.lotNumber}</td>
                    <td>{withdrawal.agreementId?.reservationId?.customerId?.customerName || '--'}</td>
                    <td>{withdrawal.agreementId?.numberOfBags || '--'}</td>
                    <td>{withdrawal.bagsWithdrawn}</td>
                    <td>{withdrawal.bagsRemaining}</td>
                    <td>{new Date(withdrawal.dispatchDate).toLocaleDateString('en-IN')}</td>
                    <td>
                      <button 
                        className="btn-print"
                        onClick={() => handlePrintWithdrawal(withdrawal)}
                        title="Print Receipt & Gate Pass"
                      >
                        🖨️ Print
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.hasMore && (
          <div className="load-more-section">
            <button 
              onClick={loadMore} 
              disabled={loading}
              className="load-more-button"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawalHistory;
