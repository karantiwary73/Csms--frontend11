import React, { useState, useMemo } from 'react';
import './CreateWithdrawal.css';
import { buildApiUrl, API_ENDPOINTS } from './api';
import { preventScrollChange } from './inputUtils';

const CreateWithdrawal = ({ user, token }) => {
  const placeholders = useMemo(() => ({
    agreementNumber: "Enter agreement number",
    bagsToWithdraw: "Enter number of bags",
    notes: "Optional notes"
  }), []);

  const [searchNumber, setSearchNumber] = useState('');
  const [agreementData, setAgreementData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [withdrawalForm, setWithdrawalForm] = useState({
    bagsToWithdraw: '',
    dispatchDate: '',
    notes: ''
  });

  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const handleSearch = async () => {
    if (!searchNumber.trim()) {
      setError('Please enter an agreement number');
      return;
    }

    setLoading(true);
    setError('');
    setAgreementData(null);

    try {
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.WITHDRAWALS_AGREEMENT)}/${searchNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAgreementData(result.data);
          setWithdrawalForm(prev => ({
            ...prev,
            bagsToWithdraw: result.data.remainingBags.toString()
          }));
        } else {
          setError(result.error || 'Failed to fetch agreement');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Agreement not found' }));
        setError(errorData.error || 'Agreement not found');
      }
    } catch (err) {
      setError('Error searching agreement: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setWithdrawalForm(prev => ({ ...prev, [name]: value }));
  };

  const remainingAfterWithdrawal = useMemo(() => {
    if (!agreementData) return 0;
    const bagsToWithdraw = parseInt(withdrawalForm.bagsToWithdraw) || 0;
    return Math.max(0, agreementData.remainingBags - bagsToWithdraw);
  }, [agreementData, withdrawalForm.bagsToWithdraw]);

  const isWithdrawalValid = () => {
    const bagsToWithdraw = parseInt(withdrawalForm.bagsToWithdraw) || 0;
    return agreementData && 
           withdrawalForm.dispatchDate &&
           bagsToWithdraw > 0 && 
           bagsToWithdraw <= agreementData.remainingBags;
  };

  const handleWithdraw = async () => {
    if (!isWithdrawalValid()) {
      setError('Please check withdrawal details');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.WITHDRAWALS_CREATE), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agreementNumber: agreementData.agreement.agreementId,
          bagsToWithdraw: parseInt(withdrawalForm.bagsToWithdraw),
          dispatchDate: withdrawalForm.dispatchDate,
          notes: withdrawalForm.notes
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSuccess(`Withdrawal successful! Withdrawal ID: ${result.data.withdrawalId}`);
          
          // Fetch payment and rebate data for the agreement
          let paymentData = [];
          let rebateData = [];
          // Calculate the FULL total charge: Storage Charge + Bag Charges + Handling Charges
          const totalStorageCharge = agreementData.agreement.charges?.totalStorageCharge || 0;
          const bagCharges = agreementData.agreement.charges?.bagChargeTotal || 0;
          const handlingCharges = agreementData.agreement.charges?.handlingChargeTotal || 0;
          const totalCharge = totalStorageCharge + bagCharges + handlingCharges;
          let totalRebates = 0;
          let totalPaid = 0;
          let netDue = totalCharge;
          
          console.log('🔍 Fetching payment and rebate data for agreement:', agreementData.agreement.agreementId);
          console.log('📊 Total charge from agreement:', totalCharge);
          
          try {
            // Fetch payments
            const paymentResponse = await fetch(
              `${buildApiUrl(API_ENDPOINTS.PAYMENTS_SEARCH)}?agreementNumber=${agreementData.agreement.agreementId}`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (paymentResponse.ok) {
              const paymentResult = await paymentResponse.json();
              console.log('💰 Payment API response:', paymentResult);
              
              if (paymentResult.success && paymentResult.data && paymentResult.data.length > 0) {
                paymentData = paymentResult.data;
                
                // Calculate total paid from all payments
                totalPaid = paymentData.reduce((sum, payment) => {
                  return sum + (payment.amountPaid || 0);
                }, 0);
                
                console.log('✅ Total paid from all payments:', totalPaid);
              } else {
                console.log('ℹ️ No payment records found');
              }
            }
            
            // Fetch rebates
            const rebateResponse = await fetch(
              `${buildApiUrl(API_ENDPOINTS.REBATES_SEARCH)}?agreementNumber=${agreementData.agreement.agreementId}`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (rebateResponse.ok) {
              const rebateResult = await rebateResponse.json();
              console.log('🎁 Rebate API response:', rebateResult);
              
              if (rebateResult.success && rebateResult.data && rebateResult.data.length > 0) {
                rebateData = rebateResult.data;
                
                // Calculate total rebates
                totalRebates = rebateData.reduce((sum, rebate) => {
                  return sum + (rebate.rebateAmount || 0);
                }, 0);
                
                console.log('✅ Total rebates:', totalRebates);
              } else {
                console.log('ℹ️ No rebate records found');
              }
            }
            
            // Calculate net due: Total Charge - Total Rebates - Total Paid
            netDue = totalCharge - totalRebates - totalPaid;
            console.log('✅ Net due calculated:', netDue);
            
          } catch (err) {
            console.error('❌ Error fetching payment/rebate data:', err);
          }
          
          // Ensure netDue is never negative or NaN
          if (isNaN(netDue) || netDue === null || netDue === undefined) {
            netDue = totalCharge;
            console.log('⚠️ NetDue was invalid, using total charge:', netDue);
          }
          netDue = Math.max(0, netDue);
          
          console.log('📝 Final netDue for receipt:', netDue);
          console.log('👤 User info:', { name: user.name, username: user.username });
          
          // Prepare receipt data
          const receipt = {
            withdrawalId: result.data.withdrawalId,
            withdrawalDate: result.data.createdOn,
            dispatchDate: result.data.dispatchDate,
            agreementNumber: agreementData.agreement.agreementId,
            reservationNumber: agreementData.agreement.reservationId?.reservationNumber || '--',
            lotNumber: agreementData.agreement.lotNumber,
            customerName: agreementData.agreement.reservationId?.customerId?.customerName || '--',
            fatherName: agreementData.agreement.reservationId?.customerId?.fatherName || '--',
            mobile: agreementData.agreement.reservationId?.customerId?.mobile || '--',
            village: agreementData.agreement.reservationId?.customerId?.addressLine1 || '--',
            post: agreementData.agreement.reservationId?.customerId?.addressLine2 || '--',
            district: agreementData.agreement.reservationId?.customerId?.district || '--',
            product: 'Potato Mark 40',
            weight: agreementData.agreement.weightInQuintal,
            totalBags: agreementData.agreement.numberOfBags,
            bagsWithdrawn: result.data.bagsWithdrawn,
            bagsRemaining: result.data.bagsRemaining,
            totalCharge: agreementData.agreement.charges?.totalStorageCharge || 0,
            rebate: totalRebates,
            afterRebate: totalCharge - totalRebates,
            netDue: netDue,
            paymentHistory: paymentData,
            createdBy: user.name || 'System User'
          };
          
          console.log('📋 Receipt data prepared:', {
            totalCharge: receipt.totalCharge,
            rebate: receipt.rebate,
            afterRebate: receipt.afterRebate,
            netDue: receipt.netDue,
            paymentCount: receipt.paymentHistory.length,
            createdBy: receipt.createdBy
          });
          
          setReceiptData(receipt);
          setShowReceipt(true);
          
          // Reset form
          setWithdrawalForm({
            bagsToWithdraw: '',
            dispatchDate: '',
            notes: ''
          });
          
          // Refresh agreement data
          handleSearch();
        } else {
          setError(result.error || 'Failed to process withdrawal');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Withdrawal processing failed' }));
        setError(errorData.error || 'Withdrawal processing failed');
      }
    } catch (err) {
      setError('Error processing withdrawal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!receiptData) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Withdrawal Receipt - ${receiptData.withdrawalId}</title>
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
                <td>${receiptData.reservationNumber}</td>
                <td>Agr No:</td>
                <td>${receiptData.agreementNumber}</td>
              </tr>
              <tr>
                <td>Name:</td>
                <td>${receiptData.customerName}</td>
                <td>Village:</td>
                <td>${receiptData.village}</td>
              </tr>
              <tr>
                <td>S/o:</td>
                <td>${receiptData.fatherName}</td>
                <td>Post:</td>
                <td>${receiptData.post}</td>
              </tr>
              <tr>
                <td>Mobile:</td>
                <td>${receiptData.mobile}</td>
                <td>District:</td>
                <td>${receiptData.district}</td>
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
                <td>${receiptData.product}</td>
                <td>${receiptData.lotNumber}</td>
                <td>${receiptData.weight}</td>
                <td>${receiptData.totalBags}</td>
                <td>₹${receiptData.totalCharge.toLocaleString('en-IN')}</td>
                <td>${receiptData.rebate}</td>
                <td>₹${receiptData.afterRebate.toLocaleString('en-IN')}</td>
              </tr>
            </table>

            <div class="net-due">Net Due: ₹${(receiptData.netDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>

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
                ${receiptData.paymentHistory && receiptData.paymentHistory.length > 0 
                  ? (() => {
                      const sortedPayments = [...receiptData.paymentHistory].sort((a, b) => 
                        new Date(a.paymentDate) - new Date(b.paymentDate)
                      );

                      let runningDue = receiptData.afterRebate;
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
                ${receiptData.createdBy}
              </div>
            </div>

            <div class="separator"></div>

            <div class="gate-pass-title">GATE PASS</div>

            <div style="margin: 4px 0;">
              <div class="gate-pass-info">
                <strong>Withdrawal:</strong> ${receiptData.withdrawalId}
                <span style="float: right;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</span>
              </div>
              <div class="gate-pass-info">
                <strong>Agreement:</strong> ${receiptData.agreementNumber}
                <span style="float: right;"><strong>Lot:</strong> ${receiptData.lotNumber}</span>
              </div>
            </div>

            <div class="bags-allowed">
              ${receiptData.bagsWithdrawn} Bags | ${new Date(receiptData.dispatchDate).toLocaleDateString('en-IN')}
            </div>

            <div class="signatures">
              <div class="signature-box">Customer Signature</div>
              <div class="signature-box">
                Authorized Signatory Signature<br/>
                ${receiptData.createdBy}
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
    <div className="create-withdrawal">
      <div className="page-header">
        <h2>Create Withdrawal</h2>
        <p>Record physical withdrawal (dispatch) of stored bags</p>
      </div>

      {error && <div className="error-message">✗ {error}</div>}
      {success && <div className="success-message">✓ {success}</div>}

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
            {loading ? 'Searching...' : 'Find'}
          </button>
        </div>
      </div>

      {/* Agreement Information */}
      {agreementData && (
        <>
          <div className="form-section">
            <h3>2. Agreement Information</h3>
            <div className="agreement-info">
              <div className="info-grid">
                <div className="info-item">
                  <label>Agreement Number:</label>
                  <span>{agreementData.agreement.agreementId}</span>
                </div>
                <div className="info-item">
                  <label>Reservation Number:</label>
                  <span>{agreementData.agreement.reservationId?.reservationNumber || '--'}</span>
                </div>
                <div className="info-item">
                  <label>Lot Number:</label>
                  <span>{agreementData.agreement.lotNumber}</span>
                </div>
                <div className="info-item">
                  <label>Name:</label>
                  <span>{agreementData.agreement.reservationId?.customerId?.customerName || '--'}</span>
                </div>
                <div className="info-item">
                  <label>Father's Name:</label>
                  <span>{agreementData.agreement.reservationId?.customerId?.fatherName || '--'}</span>
                </div>
                <div className="info-item">
                  <label>Mobile:</label>
                  <span>{agreementData.agreement.reservationId?.customerId?.mobile || '--'}</span>
                </div>
                <div className="info-item">
                  <label>Address Line 1:</label>
                  <span>{agreementData.agreement.reservationId?.customerId?.addressLine1 || '--'}</span>
                </div>
                <div className="info-item">
                  <label>Address Line 2:</label>
                  <span>{agreementData.agreement.reservationId?.customerId?.addressLine2 || '--'}</span>
                </div>
                <div className="info-item">
                  <label>Weight in Quintal:</label>
                  <span>{agreementData.agreement.weightInQuintal} Q</span>
                </div>
                <div className="info-item">
                  <label>Total Number of Bags:</label>
                  <span>{agreementData.totalBags}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Remaining Bags Summary */}
          <div className="form-section">
            <h3>3. Remaining Bags Summary</h3>
            <div className="summary-box">
              <div className="summary-item">
                <label>Total Bags (Original Agreement):</label>
                <span className="value">{agreementData.totalBags}</span>
              </div>
              <div className="summary-item">
                <label>Total Withdrawn:</label>
                <span className="value">{agreementData.totalWithdrawn}</span>
              </div>
              <div className="summary-item highlight">
                <label>Number of Remaining Bags:</label>
                <span className="value">{agreementData.remainingBags}</span>
              </div>
            </div>
          </div>

          {/* Withdrawal Input Section */}
          {agreementData.remainingBags > 0 ? (
            <div className="form-section">
              <h3>4. Withdrawal Input</h3>
              <div className="withdrawal-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Enter Number of Bags to Withdraw *</label>
                    <input
                      type="number"
                      name="bagsToWithdraw"
                      value={withdrawalForm.bagsToWithdraw}
                      onChange={handleInputChange}
                      onWheel={preventScrollChange}
                      placeholder={placeholders.bagsToWithdraw}
                      min="1"
                      max={agreementData.remainingBags}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Select Dispatch Date *</label>
                    <input
                      type="date"
                      name="dispatchDate"
                      value={withdrawalForm.dispatchDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Remaining Bags After Withdrawal (Auto-computed)</label>
                    <input
                      type="text"
                      value={remainingAfterWithdrawal}
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
                      value={withdrawalForm.notes}
                      onChange={handleInputChange}
                      placeholder={placeholders.notes}
                      rows="3"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    onClick={handleWithdraw}
                    className="btn-withdraw"
                    disabled={!isWithdrawalValid() || loading}
                  >
                    {loading ? 'Processing...' : 'Withdraw'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="form-section">
              <div className="no-bags-message">
                ⚠️ No bags remaining for withdrawal. All bags have been withdrawn.
              </div>
            </div>
          )}

          {/* Withdrawal History */}
          {agreementData.withdrawalHistory.length > 0 && (
            <div className="form-section">
              <h3>5. Withdrawal History (Agreement Level)</h3>
              <div className="withdrawal-history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Withdrawal ID</th>
                      <th>Withdrawal Date</th>
                      <th>Dispatch Date</th>
                      <th>Existing Bags</th>
                      <th>Bags Withdrawn</th>
                      <th>Remaining Bags</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agreementData.withdrawalHistory.map((withdrawal, index) => (
                      <tr key={index}>
                        <td>{withdrawal.withdrawalId}</td>
                        <td>{new Date(withdrawal.createdOn).toLocaleDateString('en-IN')}</td>
                        <td>{new Date(withdrawal.dispatchDate).toLocaleDateString('en-IN')}</td>
                        <td>{withdrawal.bagsBeforeWithdrawal}</td>
                        <td>{withdrawal.bagsWithdrawn}</td>
                        <td>{withdrawal.bagsRemaining}</td>
                        <td>{withdrawal.notes || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <div className="receipt-modal">
          <div className="receipt-content">
            <div className="receipt-header">
              <h3>Withdrawal Successful!</h3>
              <button 
                className="btn-close"
                onClick={() => setShowReceipt(false)}
              >
                ✕
              </button>
            </div>
            <div className="receipt-details">
              <p><strong>Withdrawal ID:</strong> {receiptData.withdrawalId}</p>
              <p><strong>Bags Withdrawn:</strong> {receiptData.bagsWithdrawn}</p>
              <p><strong>Bags Remaining:</strong> {receiptData.bagsRemaining}</p>
              <p><strong>Dispatch Date:</strong> {new Date(receiptData.dispatchDate).toLocaleDateString('en-IN')}</p>
            </div>
            <div className="receipt-actions">
              <button 
                onClick={handlePrintReceipt}
                className="btn-print-receipt"
              >
                🖨️ Print Receipt & Gate Pass
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

export default CreateWithdrawal;
