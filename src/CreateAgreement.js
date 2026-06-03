import React, { useState, useEffect, useMemo } from 'react';
import './CreateAgreement.css';
import { buildApiUrl, API_ENDPOINTS } from './api';
import PrintAgreementLetter from './PrintAgreementLetter';

const CreateAgreement = ({ user, token, navigationData }) => {
  // Memoized placeholder values to prevent recalculation during re-renders
  const placeholders = useMemo(() => ({
    reservationNumber: "Enter reservation number",
    ratePerQuintal: "291.00",
    weightInQuintal: "0.00", 
    numberOfBags: "0",
    notes: "Optional remarks",
    charges: "Enter amount"
  }), []);

  const [formData, setFormData] = useState({
    reservationNumber: '',
    agreementDate: '',
    product: '',
    ratePerQuintal: 291, // Fixed rate
    weightInQuintal: '',
    numberOfBags: '',
    notes: '',
    charges: {
      totalStorageCharge: '',
      advanceStorageChargesPaid: '',
      dueStorageCharge: '',
      handlingChargeTotal: '',
      handlingChargePaid: '',
      handlingChargeDue: '',
      bagChargeTotal: '',
      bagChargePaid: '',
      bagChargeDue: '',
      totalPayable: '',
      totalPaid: '',
      totalDue: ''
    }
  });

  const [products, setProducts] = useState([]);
  const [reservation, setReservation] = useState([]);
  const [existingAgreements, setExistingAgreements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedAgreementForPrint, setSelectedAgreementForPrint] = useState(null);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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

  // Calculate charges using Product API
  const calculateCharges = async (productName, weightInQuintal, numberOfBags, bagChargeTotal = 0) => {
    // Allow calculation even with 0 bags, but require product and weight
    if (!productName || !weightInQuintal || weightInQuintal <= 0) return;
    
    // Ensure numberOfBags is a valid number (can be 0)
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
        console.log('🧮 Charges calculated:', result.data);
        console.log('🔍 DEBUG Frontend: handlingChargePerBag from API:', result.data.handlingChargePerBag);
        console.log('🔍 DEBUG Frontend: handlingChargeTotal from API:', result.data.charges.handlingChargeTotal);
        
        setFormData(prev => ({
          ...prev,
          ratePerQuintal: result.data.ratePerQuintal, // Set fixed rate from product
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
    // Convert empty strings to 0 for calculations
    const safeValue = (val) => val === '' ? 0 : (parseFloat(val) || 0);
    
    // Recalculate due amounts
    updatedCharges.dueStorageCharge = safeValue(updatedCharges.totalStorageCharge) - safeValue(updatedCharges.advanceStorageChargesPaid);
    updatedCharges.handlingChargeDue = safeValue(updatedCharges.handlingChargeTotal) - safeValue(updatedCharges.handlingChargePaid);
    updatedCharges.bagChargeDue = safeValue(updatedCharges.bagChargeTotal) - safeValue(updatedCharges.bagChargePaid);

    // Recalculate totals
    updatedCharges.totalPayable = safeValue(updatedCharges.totalStorageCharge) + safeValue(updatedCharges.handlingChargeTotal) + safeValue(updatedCharges.bagChargeTotal);
    updatedCharges.totalPaid = safeValue(updatedCharges.advanceStorageChargesPaid) + safeValue(updatedCharges.handlingChargePaid) + safeValue(updatedCharges.bagChargePaid);
    updatedCharges.totalDue = updatedCharges.totalPayable - updatedCharges.totalPaid;

    // Round all numeric values to 2 decimal places
    Object.keys(updatedCharges).forEach(key => {
      if (typeof updatedCharges[key] === 'number') {
        updatedCharges[key] = Math.round(updatedCharges[key] * 100) / 100;
      }
    });

    return updatedCharges;
  };

  // Helper function to search reservation by number (for navigation)
  const searchReservationByNumber = async (reservationNumber) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${buildApiUrl(API_ENDPOINTS.RESERVATIONS)}/search?reservationNumber=${encodeURIComponent(reservationNumber)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to search reservation');
      }

      if (result.data.length === 0) {
        setError('No reservation found with this number');
        return;
      }

      const foundReservation = result.data[0];
      setReservation(foundReservation);
      
      // Fetch existing agreements first to check if this is the first agreement
      const existingAgreementsData = await fetchExistingAgreementsAndReturn(foundReservation);
      
      // Auto-populate Advance Storage Charges Paid with Reservation Fee ONLY if this is the first agreement
      if (foundReservation.reservationFee && existingAgreementsData.length === 0) {
        console.log('✅ First agreement - applying reservation fee:', foundReservation.reservationFee);
        setFormData(prev => ({
          ...prev,
          charges: {
            ...prev.charges,
            advanceStorageChargesPaid: foundReservation.reservationFee
          }
        }));
      } else if (existingAgreementsData.length > 0) {
        console.log('⚠️ Not first agreement - advance payment set to 0');
        setFormData(prev => ({
          ...prev,
          charges: {
            ...prev.charges,
            advanceStorageChargesPaid: 0
          }
        }));
      }

    } catch (err) {
      console.error('Search error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to fetch existing agreements and return them
  const fetchExistingAgreementsAndReturn = async (reservationData) => {
    try {
      const agreementsResponse = await fetch(
        `${buildApiUrl(API_ENDPOINTS.AGREEMENTS)}/existing/${reservationData.reservationNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const agreementsResult = await agreementsResponse.json();

      if (agreementsResponse.ok) {
        const agreements = agreementsResult.data || [];
        setExistingAgreements(agreements);
        return agreements;
      }
      return [];
    } catch (err) {
      console.error('Error fetching existing agreements:', err);
      return [];
    }
  };

  // Handle print agreement
  const handlePrintAgreement = async (agreement) => {
    console.log('🖨️ Print Agreement called for:', agreement);
    
    try {
      // Fetch full agreement details
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.AGREEMENTS)}/${agreement._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setSelectedAgreementForPrint(result.data);
          setShowPrintModal(true);
        } else {
          alert('Error: Invalid response from server');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Failed to fetch agreement details: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching agreement for print:', error);
      alert(`Error loading agreement details: ${error.message}`);
    }
  };

  const closePrintModal = () => {
    setShowPrintModal(false);
    setSelectedAgreementForPrint(null);
  };

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      agreementDate: getTodayDate()
    }));

    // Fetch available products
    fetchProducts();

    // Handle navigation data (pre-filled reservation)
    if (navigationData && navigationData.reservationNumber) {
      console.log('📋 Pre-filling reservation data from navigation:', navigationData.reservationNumber);
      
      // Set the reservation number and trigger search
      setFormData(prev => ({
        ...prev,
        reservationNumber: navigationData.reservationNumber
      }));

      // Set the reservation data if available
      if (navigationData.reservationData) {
        setReservation(navigationData.reservationData);
        
        // Fetch existing agreements first to check if this is the first agreement
        fetchExistingAgreementsAndReturn(navigationData.reservationData).then(existingAgreementsData => {
          // Auto-populate Advance Storage Charges Paid with Reservation Fee ONLY if this is the first agreement
          if (navigationData.reservationData.reservationFee && existingAgreementsData.length === 0) {
            console.log('✅ First agreement - applying reservation fee:', navigationData.reservationData.reservationFee);
            setFormData(prev => ({
              ...prev,
              charges: {
                ...prev.charges,
                advanceStorageChargesPaid: navigationData.reservationData.reservationFee
              }
            }));
          } else if (existingAgreementsData.length > 0) {
            console.log('⚠️ Not first agreement - advance payment set to 0');
            setFormData(prev => ({
              ...prev,
              charges: {
                ...prev.charges,
                advanceStorageChargesPaid: 0
              }
            }));
          }
        });
      } else {
        // If only reservation number is provided, search for it
        searchReservationByNumber(navigationData.reservationNumber);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigationData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('charges.')) {
      const chargeField = name.split('.')[1];
      const updatedCharges = {
        ...formData.charges,
        [chargeField]: value === '' ? '' : (parseFloat(value) || 0)
      };

      // Recalculate dependent values
      const recalculatedCharges = recalculateCharges(updatedCharges);

      setFormData(prev => ({
        ...prev,
        charges: recalculatedCharges
      }));
    } else {
      let updatedFormData = { ...formData, [name]: value };

      // Handle quintal-bags 2x relationship (similar to reservation form)
      if (name === 'weightInQuintal' && value) {
        const quintal = parseFloat(value);
        if (!isNaN(quintal)) {
          // Suggest bags = quintal * 2, but keep it editable
          updatedFormData.numberOfBags = Math.round(quintal * 2).toString();
        }
      }

      setFormData(prev => ({
        ...prev,
        ...updatedFormData
      }));

      // Auto-calculate charges when key fields change
      if (name === 'product' || name === 'weightInQuintal' || name === 'numberOfBags') {
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

  const searchReservation = async () => {
    if (!formData.reservationNumber.trim()) {
      setError('Please enter a reservation number');
      return;
    }

    await searchReservationByNumber(formData.reservationNumber.trim());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reservation) {
      setError('Please search and select a reservation first');
      return;
    }

    // Validate required fields before sending
    const requiredFields = {
      'Product': formData.product,
      'Weight in Quintal': formData.weightInQuintal,
      'Number of Bags': formData.numberOfBags
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([name, value]) => !value || value === '')
      .map(([name]) => name);

    if (missingFields.length > 0) {
      setError(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('📝 Submitting agreement data:', {
        reservationNumber: reservation.reservationNumber,
        agreementDate: formData.agreementDate,
        product: formData.product,
        ratePerQuintal: parseFloat(formData.ratePerQuintal),
        weightInQuintal: parseFloat(formData.weightInQuintal),
        numberOfBags: parseInt(formData.numberOfBags),
        notes: formData.notes,
        charges: formData.charges
      });

      const response = await fetch(buildApiUrl(API_ENDPOINTS.AGREEMENTS), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reservationNumber: reservation.reservationNumber, // Use reservationNumber instead of _id
          agreementDate: formData.agreementDate,
          product: formData.product,
          ratePerQuintal: parseFloat(formData.ratePerQuintal),
          weightInQuintal: parseFloat(formData.weightInQuintal),
          numberOfBags: parseInt(formData.numberOfBags),
          notes: formData.notes,
          charges: formData.charges
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Agreement creation failed:', result);
        throw new Error(result.error || 'Failed to create agreement');
      }

      setSuccess(`Agreement created successfully! Agreement Number: ${result.data.agreementId}, Lot Number: ${result.data.lotNumber}`);
      
      // Reset form but keep reservation data
      setFormData(prev => ({
        ...prev,
        product: '',
        ratePerQuintal: '',
        weightInQuintal: '',
        numberOfBags: '',
        notes: '',
        charges: {
          totalStorageCharge: '',
          advanceStorageChargesPaid: '',
          dueStorageCharge: '',
          handlingChargeTotal: '',
          handlingChargePaid: '',
          handlingChargeDue: '',
          bagChargeTotal: '',
          bagChargePaid: '',
          bagChargeDue: '',
          totalPayable: '',
          totalPaid: '',
          totalDue: ''
        }
      }));

      // Refresh existing agreements
      searchReservation();

    } catch (err) {
      console.error('Create agreement error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-agreement">
      <div className="page-header">
        <h2>Create New Agreement</h2>
        <p>Create agreement from existing reservation</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Reservation Search Section */}
      <div className="form-section">
        <h3>Search Reservation</h3>
        <div className="search-row">
          <div className="form-group">
            <label>Reservation Number</label>
            <input
              type="text"
              name="reservationNumber"
              value={formData.reservationNumber}
              onChange={handleInputChange}
              placeholder={placeholders.reservationNumber}
              required
            />
          </div>
          <button 
            type="button" 
            onClick={searchReservation}
            disabled={loading}
            className="search-button"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Reservation Details */}
        {reservation && (
          <div className="reservation-details">
            <h4>Reservation Details</h4>
            <div className="details-grid">
              <div><strong>Customer Name:</strong> {reservation.customerName}</div>
              <div><strong>Father's Name:</strong> {reservation.fatherName || '--'}</div>
              <div><strong>Mobile:</strong> {reservation.mobile}</div>
              <div><strong>Village:</strong> {reservation.addressLine1 || reservation.district}</div>
              <div><strong>Reserved Quintal:</strong> {reservation.reservedQuintal}</div>
              <div><strong>Number of Bags:</strong> {reservation.numberOfBags}</div>
              <div><strong>Reservation Fee:</strong> ₹{reservation.reservationFee}</div>
            </div>
          </div>
        )}
      </div>

      {/* Agreement Form */}
      {reservation && (
        <form onSubmit={handleSubmit} className="agreement-form">
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
                <label>Product * <span style={{color: 'red', fontSize: '0.9em'}}>(Required)</span></label>
                <select
                  name="product"
                  value={formData.product}
                  onChange={handleInputChange}
                  required
                  style={!formData.product ? {borderColor: '#ff6b6b'} : {}}
                >
                  <option value="">Select a product</option>
                  {products.map(product => (
                    <option key={product._id} value={product.productName}>
                      {product.productName} (₹{product.ratePerQuintal}/quintal)
                    </option>
                  ))}
                </select>
                {!formData.product && (
                  <small style={{ color: '#ff6b6b', fontSize: '0.85em' }}>
                    Please select a product
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>Rate Per Quintal (Fixed)</label>
                <input
                  type="number"
                  name="ratePerQuintal"
                  value={formData.ratePerQuintal}
                  placeholder={placeholders.ratePerQuintal}
                  step="0.01"
                  min="0"
                  readOnly
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label>Weight in Quintal * <span style={{color: 'red', fontSize: '0.9em'}}>(Required)</span></label>
                <input
                  type="number"
                  name="weightInQuintal"
                  value={formData.weightInQuintal}
                  onChange={handleInputChange}
                  placeholder={placeholders.weightInQuintal}
                  step="0.01"
                  min="0"
                  required
                  style={!formData.weightInQuintal ? {borderColor: '#ff6b6b'} : {}}
                />
                {!formData.weightInQuintal && (
                  <small style={{ color: '#ff6b6b', fontSize: '0.85em' }}>
                    Please enter weight in quintals
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>Number of Bags * <span style={{color: 'red', fontSize: '0.9em'}}>(Required)</span></label>
                <input
                  type="number"
                  name="numberOfBags"
                  value={formData.numberOfBags}
                  onChange={handleInputChange}
                  placeholder={placeholders.numberOfBags}
                  min="0"
                  required
                  style={!formData.numberOfBags ? {borderColor: '#ff6b6b'} : {}}
                />
                {!formData.numberOfBags && (
                  <small style={{ color: '#ff6b6b', fontSize: '0.85em' }}>
                    Please enter number of bags
                  </small>
                )}
              </div>

              <div className="form-group full-width">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder={placeholders.notes}
                  maxLength="255"
                  rows="3"
                />
              </div>
            </div>
          </div>

          {/* Charges Section */}
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
                    placeholder={placeholders.charges}
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
                    placeholder={placeholders.charges}
                    step="0.01"
                    min="0"
                  />
                  <small className="field-hint">Amount paid at reservation time</small>
                </div>

                <div className="form-group">
                  <label>Due Storage Charge (Auto-calculated)</label>
                  <input
                    type="number"
                    name="charges.dueStorageCharge"
                    value={formData.charges.dueStorageCharge}
                    placeholder={placeholders.charges}
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
                    placeholder={placeholders.charges}
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
                    placeholder={placeholders.charges}
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Paldari Due (Auto-calculated)</label>
                  <input
                    type="number"
                    name="charges.handlingChargeDue"
                    value={formData.charges.handlingChargeDue || ''}
                    onChange={handleInputChange}
                    placeholder={placeholders.charges}
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
                    placeholder={placeholders.charges}
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Bag Charges Paid (Manual)</label>
                  <input
                    type="number"
                    name="charges.bagChargePaid"
                    value={formData.charges.bagChargePaid || ''}
                    onChange={handleInputChange}
                    placeholder={placeholders.charges}
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Bag Charges Due (Auto-calculated)</label>
                  <input
                    type="number"
                    name="charges.bagChargeDue"
                    value={formData.charges.bagChargeDue || ''}
                    onChange={handleInputChange}
                    placeholder={placeholders.charges}
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
                    value={formData.charges.totalPayable || ''}
                    onChange={handleInputChange}
                    placeholder={placeholders.charges}
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
                    value={formData.charges.totalPaid || ''}
                    onChange={handleInputChange}
                    placeholder={placeholders.charges}
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
                    value={formData.charges.totalDue || ''}
                    onChange={handleInputChange}
                    placeholder={placeholders.charges}
                    step="0.01"
                    min="0"
                    readOnly
                    style={{ backgroundColor: '#fff3e0', cursor: 'not-allowed', fontWeight: '600' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading} className="create-button">
              {loading ? 'Creating Agreement...' : 'Create Agreement'}
            </button>
          </div>
        </form>
      )}

      {/* Existing Agreements Section */}
      {reservation && existingAgreements.length > 0 && (
        <div className="form-section">
          <h3>Existing Agreements</h3>
          <div className="existing-agreements-table">
            <table>
              <thead>
                <tr>
                  <th>Agreement Date</th>
                  <th>Agreement Number</th>
                  <th>Lot Number</th>
                  <th>Weight in Quintal</th>
                  <th>Advance Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {existingAgreements.map((agreement, index) => (
                  <tr key={index}>
                    <td>{new Date(agreement.agreementDate).toLocaleDateString('en-IN')}</td>
                    <td>{agreement.agreementId}</td>
                    <td>{agreement.lotNumber}</td>
                    <td>{agreement.weightInQuintal}</td>
                    <td>₹{agreement.charges?.advanceStorageChargesPaid || 0}</td>
                    <td>
                      <button 
                        className="btn-action"
                        onClick={() => handlePrintAgreement(agreement)}
                        title="Print Agreement"
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

      {/* Print Modal */}
      {showPrintModal && selectedAgreementForPrint && (
        <PrintAgreementLetter 
          agreement={selectedAgreementForPrint}
          user={user}
          onClose={closePrintModal}
        />
      )}
    </div>
  );
};

export default CreateAgreement;