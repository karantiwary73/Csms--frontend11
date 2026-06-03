import React, { useState, useEffect } from 'react';
import './EditAgreement.css';
import PrintAgreementLetter from './PrintAgreementLetter';
import { buildApiUrl, API_ENDPOINTS } from './api';

const EditAgreement = ({ user, token, navigationData, navigateToView }) => {
  const [formData, setFormData] = useState({
    agreementDate: '',
    product: '',
    ratePerQuintal: 291,
    weightInQuintal: '',
    numberOfBags: '',
    notes: '',
    charges: {
      totalStorageCharge: 0,
      advanceStorageChargesPaid: 0,
      dueStorageCharge: 0,
      handlingChargeTotal: 0,
      handlingChargePaid: 0,
      handlingChargeDue: 0,
      bagChargeTotal: 0,
      bagChargePaid: 0,
      bagChargeDue: 0,
      totalPayable: 0,
      totalPaid: 0,
      totalDue: 0
    }
  });

  const [products, setProducts] = useState([]);
  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [bagsManuallyEdited, setBagsManuallyEdited] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  // Reservation lookup states
  const [reservationLookup, setReservationLookup] = useState({
    reservationNumber: '',
    loading: false,
    found: false,
    notFound: false,
    customerName: ''
  });

  // Get agreement ID from navigation data
  const agreementId = navigationData?.agreementId;

  useEffect(() => {
    if (agreementId) {
      fetchAgreementDetails();
      fetchProducts();
    } else {
      setError('No agreement ID provided');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreementId]);

  // Fetch available products
  const fetchProducts = async () => {
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.PRODUCTS), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setProducts(result.data);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchAgreementDetails = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.AGREEMENTS)}/${agreementId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch agreement details');
      }

      const agreementData = result.data;
      setAgreement(agreementData);

      // Lock editing for non-ADMIN users if payments exist
      if (result.hasActivePayments && user?.role !== 'ADMIN') {
        setIsLocked(true);
      }

      // Initialize reservation lookup state with current agreement data
      setReservationLookup({
        reservationNumber: agreementData.reservationNumber || '',
        loading: false,
        found: !!agreementData.reservationNumber,
        notFound: false,
        customerName: agreementData.customerName || ''
      });

      // Populate form with agreement data
      setFormData({
        agreementDate: agreementData.agreementDate ? agreementData.agreementDate.split('T')[0] : '',
        product: agreementData.product || '',
        ratePerQuintal: agreementData.ratePerQuintal || 291,
        weightInQuintal: agreementData.weightInQuintal || '',
        numberOfBags: agreementData.numberOfBags || '',
        notes: agreementData.notes || '',
        charges: {
          totalStorageCharge: agreementData.charges?.totalStorageCharge || 0,
          advanceStorageChargesPaid: agreementData.charges?.advanceStorageChargesPaid || 0,
          dueStorageCharge: agreementData.charges?.dueStorageCharge || 0,
          handlingChargeTotal: agreementData.charges?.handlingChargeTotal || 0,
          handlingChargePaid: agreementData.charges?.handlingChargePaid || 0,
          handlingChargeDue: agreementData.charges?.handlingChargeDue || 0,
          bagChargeTotal: agreementData.charges?.bagChargeTotal || 0,
          bagChargePaid: agreementData.charges?.bagChargePaid || 0,
          bagChargeDue: agreementData.charges?.bagChargeDue || 0,
          totalPayable: agreementData.charges?.totalPayable || 0,
          totalPaid: agreementData.charges?.totalPaid || 0,
          totalDue: agreementData.charges?.totalDue || 0
        }
      });

    } catch (err) {
      console.error('Fetch agreement error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch reservation details by reservation number
  const fetchReservationDetails = async (resNumber) => {
    if (!resNumber || !resNumber.trim()) {
      setReservationLookup({
        reservationNumber: '',
        loading: false,
        found: false,
        notFound: false,
        customerName: ''
      });
      return;
    }

    setReservationLookup(prev => ({
      ...prev,
      loading: true,
      found: false,
      notFound: false
    }));

    try {
      console.log('🔍 Looking up reservation:', resNumber);
      
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.RESERVATIONS_BY_NUMBER)}/${resNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Reservation found:', result.data);
        
        setReservationLookup({
          reservationNumber: resNumber,
          loading: false,
          found: true,
          notFound: false,
          customerName: result.data.customerName || ''
        });

        // Update agreement state with fetched customer name
        setAgreement(prev => ({
          ...prev,
          customerName: result.data.customerName || '',
          reservationNumber: resNumber
        }));

      } else {
        console.log('❌ Reservation not found:', resNumber);
        
        setReservationLookup({
          reservationNumber: resNumber,
          loading: false,
          found: false,
          notFound: true,
          customerName: ''
        });
      }

    } catch (err) {
      console.error('Reservation lookup error:', err);
      
      setReservationLookup({
        reservationNumber: resNumber,
        loading: false,
        found: false,
        notFound: true,
        customerName: ''
      });
    }
  };

  // Calculate charges using Product API
  const calculateCharges = async (productName, weightInQuintal, numberOfBags, bagChargeTotal = 0) => {
    if (!productName || !weightInQuintal || weightInQuintal <= 0) return;
    
    const validNumberOfBags = parseInt(numberOfBags) || 0;

    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.PRODUCTS_CALCULATE_CHARGES), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productName,
          weightInQuintal: parseFloat(weightInQuintal),
          numberOfBags: validNumberOfBags,
          bagChargeTotal: parseFloat(bagChargeTotal) || 0,
          advanceStorageChargesPaid: formData.charges.advanceStorageChargesPaid || 0,
          handlingChargePaid: formData.charges.handlingChargePaid || 0,
          bagChargePaid: formData.charges.bagChargePaid || 0
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🧮 Charges recalculated:', result.data);
        console.log('🔍 DEBUG EditAgreement: handlingChargePerBag from API:', result.data.handlingChargePerBag);
        console.log('🔍 DEBUG EditAgreement: handlingChargeTotal from API:', result.data.charges.handlingChargeTotal);
        
        setFormData(prev => ({
          ...prev,
          ratePerQuintal: result.data.ratePerQuintal,
          charges: result.data.charges
        }));
      } else {
        const errorResult = await response.json();
        console.error('Charge calculation error:', errorResult);
        setError('Failed to calculate charges: ' + (errorResult.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error calculating charges:', err);
      setError('Failed to calculate charges. Please try again.');
    }
  };

  // Recalculate charges when payment amounts change
  const recalculateCharges = (updatedCharges) => {
    // Helper function to safely convert values to numbers
    const safeValue = (val) => {
      if (val === '' || val === null || val === undefined) return 0;
      return parseFloat(val) || 0;
    };

    updatedCharges.dueStorageCharge = safeValue(updatedCharges.totalStorageCharge) - safeValue(updatedCharges.advanceStorageChargesPaid);
    updatedCharges.handlingChargeDue = safeValue(updatedCharges.handlingChargeTotal) - safeValue(updatedCharges.handlingChargePaid);
    updatedCharges.bagChargeDue = safeValue(updatedCharges.bagChargeTotal) - safeValue(updatedCharges.bagChargePaid);

    updatedCharges.totalPayable = safeValue(updatedCharges.totalStorageCharge) + safeValue(updatedCharges.handlingChargeTotal) + safeValue(updatedCharges.bagChargeTotal);
    updatedCharges.totalPaid = safeValue(updatedCharges.advanceStorageChargesPaid) + safeValue(updatedCharges.handlingChargePaid) + safeValue(updatedCharges.bagChargePaid);
    updatedCharges.totalDue = updatedCharges.totalPayable - updatedCharges.totalPaid;

    // Round all values to 2 decimal places
    Object.keys(updatedCharges).forEach(key => {
      if (typeof updatedCharges[key] === 'number') {
        updatedCharges[key] = Math.round(updatedCharges[key] * 100) / 100;
      }
    });

    return updatedCharges;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('charges.')) {
      const chargeField = name.split('.')[1];
      const updatedCharges = {
        ...formData.charges,
        [chargeField]: value === '' ? '' : (parseFloat(value) || 0)
      };

      const recalculatedCharges = recalculateCharges(updatedCharges);

      setFormData(prev => ({
        ...prev,
        charges: recalculatedCharges
      }));
    } else {
      // Handle quintal-to-bags suggestion (2x relationship)
      if (name === 'weightInQuintal' && !bagsManuallyEdited) {
        const quintalValue = parseFloat(value) || 0;
        const suggestedBags = quintalValue * 2;
        
        setFormData(prev => ({
          ...prev,
          [name]: value,
          numberOfBags: suggestedBags > 0 ? Math.round(suggestedBags) : ''
        }));
      } else if (name === 'numberOfBags') {
        // Mark bags as manually edited once user changes it
        setBagsManuallyEdited(true);
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }

      // Auto-calculate charges when key fields change
      if (name === 'product' || name === 'weightInQuintal' || name === 'numberOfBags') {
        const updatedFormData = { 
          ...formData, 
          [name]: name === 'numberOfBags' ? value : (name === 'weightInQuintal' && !bagsManuallyEdited ? value : formData[name])
        };
        
        // If weightInQuintal changed and bags not manually edited, use suggested bags
        if (name === 'weightInQuintal' && !bagsManuallyEdited) {
          const quintalValue = parseFloat(value) || 0;
          updatedFormData.numberOfBags = quintalValue * 2 > 0 ? Math.round(quintalValue * 2) : '';
        }
        
        if (updatedFormData.product && updatedFormData.weightInQuintal && updatedFormData.numberOfBags) {
          calculateCharges(
            updatedFormData.product,
            updatedFormData.weightInQuintal,
            updatedFormData.numberOfBags,
            updatedFormData.charges.bagChargeTotal
          );
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('📝 Updating agreement:', agreementId);

      // Prepare update data
      const updatePayload = {
        agreementDate: formData.agreementDate,
        product: formData.product,
        ratePerQuintal: parseFloat(formData.ratePerQuintal),
        weightInQuintal: parseFloat(formData.weightInQuintal),
        numberOfBags: parseInt(formData.numberOfBags),
        notes: formData.notes,
        charges: formData.charges
      };

      // If reservation number was changed and found, update the reservationId
      if (reservationLookup.found && reservationLookup.reservationNumber) {
        // Fetch the reservation to get its ObjectId
        const resResponse = await fetch(`${buildApiUrl(API_ENDPOINTS.RESERVATIONS_BY_NUMBER)}/${reservationLookup.reservationNumber}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (resResponse.ok) {
          const resResult = await resResponse.json();
          if (resResult.success && resResult.data._id) {
            updatePayload.reservationId = resResult.data._id;
            console.log('📎 Linking to reservation:', reservationLookup.reservationNumber, '(ID:', resResult.data._id, ')');
          }
        }
      }

      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.AGREEMENTS)}/${agreementId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Agreement update failed:', result);
        throw new Error(result.error || 'Failed to update agreement');
      }

      setSuccess(`Agreement updated successfully! Agreement #${agreement.agreementId}`);
      
      // Refresh agreement data to show updated values
      fetchAgreementDetails();

    } catch (err) {
      console.error('Update agreement error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintLetter = () => {
    console.log('🖨️ Print Agreement Letter:', agreement.agreementId);
    setShowPrintModal(true);
  };

  const closePrintModal = () => {
    setShowPrintModal(false);
  };

  // Handle reservation number input change
  const handleReservationNumberChange = (e) => {
    const value = e.target.value;
    setReservationLookup(prev => ({
      ...prev,
      reservationNumber: value,
      found: false,
      notFound: false
    }));
  };

  // Handle search button click
  const handleSearchReservation = () => {
    fetchReservationDetails(reservationLookup.reservationNumber);
  };

  if (loading && !agreement) {
    return <div className="loading">Loading agreement details...</div>;
  }

  if (error && !agreement) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="edit-agreement">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2>Edit Agreement</h2>
            <p>Update agreement details and charges</p>
          </div>
          <button 
            onClick={() => navigateToView('history-agreement')} 
            className="btn-back"
          >
            ← Back to History
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {isLocked && (
        <div className="error-message" style={{ backgroundColor: '#fff3e0', color: '#e65100', border: '1px solid #ffcc80', padding: '12px 16px', marginBottom: '16px' }}>
          ⚠️ This agreement cannot be edited because payments have been received. Contact an admin to make changes.
        </div>
      )}

      {agreement && (
        <form onSubmit={handleSubmit} className="agreement-form">
          <fieldset disabled={isLocked} style={isLocked ? { opacity: 0.7 } : {}}>
          {/* Agreement Identification */}
          <div className="form-section">
            <h3>Agreement Identification</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Agreement Number (Read-only)</label>
                <input
                  type="text"
                  value={agreement.agreementId}
                  readOnly
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label>Lot Number (Read-only)</label>
                <input
                  type="text"
                  value={agreement.lotNumber}
                  readOnly
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label>Reservation Number</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={reservationLookup.reservationNumber}
                      onChange={handleReservationNumberChange}
                      placeholder="Enter reservation number"
                      style={{
                        borderColor: reservationLookup.found ? '#4CAF50' : 
                                    reservationLookup.notFound ? '#f44336' : '#ddd'
                      }}
                    />
                    {reservationLookup.found && (
                      <small style={{ color: '#4CAF50', fontSize: '0.85em', display: 'block', marginTop: '4px' }}>
                        ✓ Reservation found
                      </small>
                    )}
                    {reservationLookup.notFound && (
                      <small style={{ color: '#f44336', fontSize: '0.85em', display: 'block', marginTop: '4px' }}>
                        ✗ Reservation not found
                      </small>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchReservation}
                    disabled={reservationLookup.loading || !reservationLookup.reservationNumber.trim()}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: reservationLookup.loading ? 'wait' : 'pointer',
                      fontSize: '14px',
                      whiteSpace: 'nowrap',
                      opacity: (!reservationLookup.reservationNumber.trim() || reservationLookup.loading) ? 0.6 : 1
                    }}
                  >
                    {reservationLookup.loading ? '🔍 Searching...' : '🔍 Search'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Customer Name {reservationLookup.found && '(From Reservation)'}</label>
                <input
                  type="text"
                  value={reservationLookup.found ? reservationLookup.customerName : (agreement.customerName || 'N/A')}
                  readOnly
                  style={{ 
                    backgroundColor: reservationLookup.found ? '#e8f5e9' : '#f5f5f5', 
                    cursor: 'not-allowed',
                    color: reservationLookup.found ? '#2e7d32' : '#666'
                  }}
                />
                {reservationLookup.found && (
                  <small style={{ color: '#4CAF50', fontSize: '0.85em', display: 'block', marginTop: '4px' }}>
                    Auto-populated from reservation
                  </small>
                )}
              </div>
            </div>
          </div>

          {/* Audit Information */}
          <div className="form-section">
            <h3>Audit Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Created By</label>
                <input
                  type="text"
                  value={agreement.createdBy || 'Unknown'}
                  readOnly
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label>Created On</label>
                <input
                  type="text"
                  value={agreement.createdOn ? new Date(agreement.createdOn).toLocaleString('en-IN') : 'Unknown'}
                  readOnly
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label>Last Updated By</label>
                <input
                  type="text"
                  value={agreement.updatedBy || 'Not updated'}
                  readOnly
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label>Last Updated On</label>
                <input
                  type="text"
                  value={agreement.updatedDate ? new Date(agreement.updatedDate).toLocaleString('en-IN') : 'Not updated'}
                  readOnly
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>
            </div>
          </div>

          {/* Editable Agreement Details */}
          <div className="form-section">
            <h3>Agreement Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Agreement Date *</label>
                <input
                  type="date"
                  name="agreementDate"
                  value={formData.agreementDate}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Product *</label>
                <select
                  name="product"
                  value={formData.product}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select a product</option>
                  {products.map(product => (
                    <option key={product._id} value={product.productName}>
                      {product.productName} (₹{product.ratePerQuintal}/quintal)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Rate Per Quintal (Fixed)</label>
                <input
                  type="number"
                  name="ratePerQuintal"
                  value={formData.ratePerQuintal}
                  step="0.01"
                  min="0"
                  readOnly
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
                <small style={{ color: '#666', fontSize: '0.85em' }}>
                  Fixed rate of ₹291 per quintal for all products
                </small>
              </div>

              <div className="form-group">
                <label>Weight in Quintal *</label>
                <input
                  type="number"
                  name="weightInQuintal"
                  value={formData.weightInQuintal}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label>Number of Bags *</label>
                <input
                  type="number"
                  name="numberOfBags"
                  value={formData.numberOfBags}
                  onChange={handleInputChange}
                  min="0"
                  required
                  style={!bagsManuallyEdited && formData.weightInQuintal ? { 
                    borderLeft: '3px solid #4CAF50' 
                  } : {}}
                />
                {!bagsManuallyEdited && formData.weightInQuintal && (
                  <small style={{ color: '#4CAF50', fontSize: '0.85em' }}>
                    💡 Suggested: {Math.round(formData.weightInQuintal * 2)} bags (2x quintal)
                  </small>
                )}
              </div>

              <div className="form-group full-width">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  maxLength="255"
                  rows="3"
                />
              </div>
            </div>
          </div>

          {/* Charges & Payment Fields */}
          <div className="form-section">
            <h3>Charges & Payments</h3>
            
            {/* Storage Charges Row */}
            <div className="charge-row">
              <h4 className="charge-category">Storage Charges</h4>
              <div className="charge-fields">
                <div className="form-group">
                  <label>Total Storage Charge (Auto-calculated)</label>
                  <input
                    type="number"
                    name="charges.totalStorageCharge"
                    value={formData.charges.totalStorageCharge}
                    step="0.01"
                    min="0"
                    readOnly
                    style={{ backgroundColor: '#f0f8ff', cursor: 'not-allowed' }}
                  />
                  <small className="field-hint">Weight × ₹291 per quintal</small>
                </div>

                <div className="form-group">
                  <label>Advance Paid (Manual)</label>
                  <input
                    type="number"
                    name="charges.advanceStorageChargesPaid"
                    value={formData.charges.advanceStorageChargesPaid || ''}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    placeholder="Enter amount"
                  />
                  <small className="field-hint">Amount paid at reservation time</small>
                </div>

                <div className="form-group">
                  <label>Due Storage Charge (Auto-calculated)</label>
                  <input
                    type="number"
                    name="charges.dueStorageCharge"
                    value={formData.charges.dueStorageCharge}
                    step="0.01"
                    min="0"
                    readOnly
                    style={{ backgroundColor: '#f0f8ff', cursor: 'not-allowed' }}
                  />
                </div>
              </div>
            </div>

            {/* Handling Charges Row */}
            <div className="charge-row">
              <h4 className="charge-category">Handling Charges (Paldari)</h4>
              <div className="charge-fields">
                <div className="form-group">
                  <label>Paldari Total (Auto-calculated)</label>
                  <input
                    type="number"
                    name="charges.handlingChargeTotal"
                    value={formData.charges.handlingChargeTotal}
                    step="0.01"
                    min="0"
                    readOnly
                    style={{ backgroundColor: '#f0f8ff', cursor: 'not-allowed' }}
                  />
                  <small className="field-hint">Bags × ₹9 per bag</small>
                </div>

                <div className="form-group">
                  <label>Paldari Paid (Manual)</label>
                  <input
                    type="number"
                    name="charges.handlingChargePaid"
                    value={formData.charges.handlingChargePaid || ''}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    placeholder="Enter amount"
                  />
                </div>

                <div className="form-group">
                  <label>Paldari Due (Auto-calculated)</label>
                  <input
                    type="number"
                    name="charges.handlingChargeDue"
                    value={formData.charges.handlingChargeDue}
                    step="0.01"
                    min="0"
                    readOnly
                    style={{ backgroundColor: '#f0f8ff', cursor: 'not-allowed' }}
                  />
                </div>
              </div>
            </div>

            {/* Bag Charges Row */}
            <div className="charge-row">
              <h4 className="charge-category">Bag Charges</h4>
              <div className="charge-fields">
                <div className="form-group">
                  <label>Bag Charges Total (Manual)</label>
                  <input
                    type="number"
                    name="charges.bagChargeTotal"
                    value={formData.charges.bagChargeTotal || ''}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    placeholder="Enter amount"
                  />
                </div>

                <div className="form-group">
                  <label>Bag Charges Paid (Manual)</label>
                  <input
                    type="number"
                    name="charges.bagChargePaid"
                    value={formData.charges.bagChargePaid || ''}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    placeholder="Enter amount"
                  />
                </div>

                <div className="form-group">
                  <label>Bag Charges Due (Auto-calculated)</label>
                  <input
                    type="number"
                    name="charges.bagChargeDue"
                    value={formData.charges.bagChargeDue}
                    step="0.01"
                    min="0"
                    readOnly
                    style={{ backgroundColor: '#f0f8ff', cursor: 'not-allowed' }}
                  />
                </div>
              </div>
            </div>

            {/* Total Summary Row */}
            <div className="charge-row total-summary">
              <h4 className="charge-category">Total Summary</h4>
              <div className="charge-fields">
                <div className="form-group highlight-field">
                  <label>Total Payable (Auto-calculated)</label>
                  <input
                    type="number"
                    name="charges.totalPayable"
                    value={formData.charges.totalPayable}
                    step="0.01"
                    min="0"
                    readOnly
                    style={{ backgroundColor: '#e8f5e9', cursor: 'not-allowed', fontWeight: '600' }}
                  />
                </div>

                <div className="form-group highlight-field">
                  <label>Total Paid (Auto-calculated)</label>
                  <input
                    type="number"
                    name="charges.totalPaid"
                    value={formData.charges.totalPaid}
                    step="0.01"
                    min="0"
                    readOnly
                    style={{ backgroundColor: '#e3f2fd', cursor: 'not-allowed', fontWeight: '600' }}
                  />
                </div>

                <div className="form-group highlight-field">
                  <label>Total Due (Auto-calculated)</label>
                  <input
                    type="number"
                    name="charges.totalDue"
                    value={formData.charges.totalDue}
                    step="0.01"
                    min="0"
                    readOnly
                    style={{ backgroundColor: '#fff3e0', cursor: 'not-allowed', fontWeight: '600' }}
                  />
                </div>
              </div>
            </div>
          </div>

          </fieldset>

          {/* Actions */}
          <div className="form-actions">
            <button type="submit" disabled={loading || isLocked} className="update-button">
              {loading ? 'Updating Agreement...' : isLocked ? 'Editing Locked' : 'Update Agreement'}
            </button>
            <button 
              type="button" 
              onClick={handlePrintLetter}
              className="print-button"
              disabled={loading}
            >
              View & Print Agreement Letter
            </button>
          </div>
        </form>
      )}

      {/* Print Modal */}
      {showPrintModal && agreement && (
        <PrintAgreementLetter 
          agreement={agreement}
          user={user}
          onClose={closePrintModal}
        />
      )}
    </div>
  );
};

export default EditAgreement;