import React, { useState, useMemo, useEffect } from 'react';
import './CreateReservation.css';
import { buildApiUrl, API_ENDPOINTS } from './api';
import { getStates, getDistrictsByState } from './stateDistrictData';

/**
 * Create New Reservation Component
 * 
 * Provides a form for creating new reservations with:
 * - All mandatory fields
 * - Form validation with error display
 * - Submit button enable/disable logic
 * - Success message with generated ID
 * - Error handling
 * 
 * Requirements: 1.1-1.11
 */
const CreateReservation = ({ user, token, navigationData, navigateToView }) => {
  // Get today's date in local timezone (not UTC)
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Memoized placeholder values to prevent recalculation during re-renders
  const placeholders = useMemo(() => ({
    reservationNumber: "Enter reservation number",
    mobile: "10 digits",
    altMobile: "10 digits (optional)",
    pinCode: "6 digits"
  }), []);

  const [formData, setFormData] = useState({
    reservationNumber: '',
    date: getTodayDate(),
    expectedArrivalDate: '',
    mobile: '',
    altMobile: '',
    email: '',
    customerName: '',
    fatherName: '',
    reservationRate: '291',
    reservedQuintal: '',
    numberOfBags: '',
    reservationFee: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: '',
    state: '',
    pinCode: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [bagsManuallyEdited, setBagsManuallyEdited] = useState(false); // Track if user manually edited bags
  const [isEditMode, setIsEditMode] = useState(false); // Track if we're in edit mode
  const [originalReservationId, setOriginalReservationId] = useState(null); // Store original ID for updates

  // Helper function to safely render error messages
  const renderError = (error) => {
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
      return error.message || JSON.stringify(error);
    }
    return String(error);
  };

  // Handle back button click
  const handleBack = () => {
    if (navigateToView) {
      navigateToView('history-reservation');
    } else {
      window.history.back();
    }
  };

  // Pre-fill form when editing (navigationData contains editMode and reservationData)
  useEffect(() => {
    if (navigationData?.editMode && navigationData?.reservationData) {
      const res = navigationData.reservationData;
      console.log('📝 Pre-filling form with reservation data:', res);
      
      setIsEditMode(true);
      setOriginalReservationId(res.reservationId || res._id);
      
      // Format dates to YYYY-MM-DD for input fields
      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Pre-fill form with reservation data
      setFormData({
        reservationNumber: res.reservationNumber || '',
        date: formatDate(res.date) || getTodayDate(),
        expectedArrivalDate: formatDate(res.expectedArrivalDate) || '',
        mobile: res.mobile || '',
        altMobile: res.altMobile || '',
        email: res.email || '',
        customerName: res.customerName || '',
        fatherName: res.fatherName || '',
        reservationRate: res.reservationRate?.toString() || '291',
        reservedQuintal: res.reservedQuintal?.toString() || '',
        numberOfBags: res.numberOfBags?.toString() || '',
        reservationFee: res.reservationFee?.toString() || '',
        addressLine1: res.addressLine1 || '',
        addressLine2: res.addressLine2 || '',
        city: res.city || '',
        district: res.district || '',
        state: res.state || '',
        pinCode: res.pinCode || ''
      });

      // Set available districts if state is present
      if (res.state) {
        const districts = getDistrictsByState(res.state);
        setAvailableDistricts(districts);
      }
    }
  }, [navigationData]);

  // Validate form data
  const validateForm = () => {
    const newErrors = {};

    // Check mandatory fields (only Name and Mobile are mandatory for Vendor/Farmer Details)
    if (!formData.reservationNumber) newErrors.reservationNumber = 'Reservation number is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.expectedArrivalDate) newErrors.expectedArrivalDate = 'Expected arrival date is required';
    if (!formData.mobile) newErrors.mobile = 'Mobile number is required';
    if (!formData.customerName) newErrors.customerName = 'Customer name is required';
    if (!formData.reservationRate) newErrors.reservationRate = 'Reservation rate is required';
    if (!formData.reservedQuintal) newErrors.reservedQuintal = 'Reserved quintal is required';
    if (!formData.numberOfBags) newErrors.numberOfBags = 'Number of bags is required';
    if (!formData.reservationFee) newErrors.reservationFee = 'Reservation fee is required';
    // Address fields are now optional - no validation needed

    // Validate reservation number (max 10 chars)
    if (formData.reservationNumber && formData.reservationNumber.length > 10) {
      newErrors.reservationNumber = 'Reservation number must be 10 characters or less';
    }

    // Validate mobile number (10 digits)
    if (formData.mobile && !/^\d{10}$/.test(formData.mobile)) {
      newErrors.mobile = 'Mobile number must be exactly 10 digits';
    }

    // Validate alternate mobile (10 digits or empty)
    if (formData.altMobile && !/^\d{10}$/.test(formData.altMobile)) {
      newErrors.altMobile = 'Alternate mobile must be exactly 10 digits';
    }

    // Validate email format
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email address is not in valid format';
    }

    // Validate PIN code (6 digits)
    if (formData.pinCode && !/^\d{6}$/.test(formData.pinCode)) {
      newErrors.pinCode = 'PIN code must be exactly 6 digits';
    }

    // Validate expected arrival date (not earlier than reservation date)
    if (formData.expectedArrivalDate && formData.date) {
      const reservationDate = new Date(formData.date);
      const arrivalDate = new Date(formData.expectedArrivalDate);
      if (arrivalDate < reservationDate) {
        newErrors.expectedArrivalDate = 'Expected arrival date cannot be earlier than reservation date';
      }
    }

    // Validate numeric fields
    if (formData.reservationRate && isNaN(formData.reservationRate)) {
      newErrors.reservationRate = 'Reservation rate must be a number';
    }

    if (formData.reservedQuintal && isNaN(formData.reservedQuintal)) {
      newErrors.reservedQuintal = 'Reserved quintal must be a number';
    }

    if (formData.numberOfBags && isNaN(formData.numberOfBags)) {
      newErrors.numberOfBags = 'Number of bags must be a number';
    }

    if (formData.reservationFee && isNaN(formData.reservationFee)) {
      newErrors.reservationFee = 'Reservation fee must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if form is valid for submit button (only mandatory fields)
  const isFormValid = () => {
    return (
      formData.reservationNumber &&
      formData.date &&
      formData.expectedArrivalDate &&
      formData.mobile &&
      formData.customerName &&
      formData.reservationRate &&
      formData.reservedQuintal &&
      formData.numberOfBags &&
      formData.reservationFee &&
      Object.keys(errors).length === 0
    );
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    let newFormData = {
      ...formData,
      [name]: value
    };

    // Handle state change - update available districts and clear district selection
    if (name === 'state') {
      const districts = getDistrictsByState(value);
      setAvailableDistricts(districts);
      newFormData.district = ''; // Clear district when state changes
    }

    // Handle bag/quintal suggestion (2x relationship - only suggest bags when quintal changes)
    if (name === 'reservedQuintal' && value) {
      const quintal = parseFloat(value);
      if (!isNaN(quintal)) {
        // Only auto-suggest bags value if user hasn't manually edited bags field
        if (!bagsManuallyEdited) {
          newFormData.numberOfBags = Math.round(quintal * 2).toString();
        }
      }
    } else if (name === 'numberOfBags') {
      // Mark bags as manually edited when user changes it
      setBagsManuallyEdited(true);
    }

    // Validate expected arrival date against reservation date
    if (name === 'expectedArrivalDate' && value && newFormData.date) {
      const reservationDate = new Date(newFormData.date);
      const arrivalDate = new Date(value);
      if (arrivalDate < reservationDate) {
        setErrors(prev => ({
          ...prev,
          expectedArrivalDate: 'Expected arrival date cannot be earlier than reservation date'
        }));
      } else {
        // Remove the error completely when validation passes
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.expectedArrivalDate;
          return newErrors;
        });
      }
    }

    setFormData(newFormData);
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setErrorMessage('Please fix the validation errors');
      return;
    }

    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const authToken = token || localStorage.getItem('token');
      
      // Determine URL and method based on edit mode
      const url = isEditMode 
        ? `${buildApiUrl(API_ENDPOINTS.RESERVATIONS)}/${formData.reservationNumber}`
        : buildApiUrl(API_ENDPOINTS.RESERVATIONS);
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      console.log(`${isEditMode ? '📝 Updating' : '📝 Creating'} reservation:`, formData.reservationNumber);
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(formData)
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        setErrorMessage('Server error: Invalid response format');
        setLoading(false);
        return;
      }

      if (response.ok) {
        if (isEditMode) {
          setSuccessMessage(`Reservation updated successfully! Number: ${formData.reservationNumber}`);
        } else {
          if (data.data && data.data.reservationId) {
            setSuccessMessage(`Reservation created successfully! ID: ${data.data.reservationId}`);
          } else {
            setSuccessMessage('Reservation created successfully!');
          }
        }
        
        // Reset form only if creating (not editing)
        if (!isEditMode) {
          setFormData({
            reservationNumber: '',
            date: getTodayDate(),
            expectedArrivalDate: '',
            mobile: '',
            altMobile: '',
            email: '',
            customerName: '',
            fatherName: '',
            reservationRate: '291',
            reservedQuintal: '',
            numberOfBags: '',
            reservationFee: '',
            addressLine1: '',
            addressLine2: '',
            city: '',
            district: '',
            state: '',
            pinCode: ''
          });
          setErrors({});
          setAvailableDistricts([]);
          setBagsManuallyEdited(false);
        }
      } else {
        // Handle error response
        const errorMsg = data?.error || data?.message || `Failed to ${isEditMode ? 'update' : 'create'} reservation`;
        setErrorMessage(errorMsg);
        
        // Log the full response for debugging
        console.error('Backend error response:', data);
        
        // Try to extract field-level errors
        if (data?.details && Array.isArray(data.details)) {
          const detailErrors = {};
          data.details.forEach(detail => {
            if (detail && detail.field && detail.message) {
              // Ensure we only set the message string, not the whole object
              detailErrors[detail.field] = String(detail.message);
            } else if (detail && typeof detail === 'object') {
              // If detail is an object without field/message structure, log it
              console.warn('Unexpected error detail format:', detail);
            }
          });
          if (Object.keys(detailErrors).length > 0) {
            setErrors(detailErrors);
          }
        } else if (data?.details && typeof data.details === 'object') {
          // Handle case where details is an object, not an array
          const detailErrors = {};
          Object.keys(data.details).forEach(field => {
            const detail = data.details[field];
            if (typeof detail === 'string') {
              detailErrors[field] = detail;
            } else if (detail && detail.message) {
              detailErrors[field] = String(detail.message);
            }
          });
          if (Object.keys(detailErrors).length > 0) {
            setErrors(detailErrors);
          }
        }
      }
    } catch (error) {
      console.error('Request error:', error);
      setErrorMessage('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-reservation-container">
      <div className="page-header-with-back">
        {isEditMode && (
          <button 
            type="button"
            className="btn-back" 
            onClick={handleBack}
            title="Back to Reservation History"
          >
            ← Back
          </button>
        )}
        <h1>{isEditMode ? 'Edit Reservation' : 'Create New Reservation'}</h1>
      </div>

      {successMessage && (
        <div className="success-message">
          ✓ {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="error-message">
          ✗ {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="reservation-form">
        <div className="form-section">
          <h2>Reservation Details</h2>

          <div className="form-group">
            <label htmlFor="reservationNumber">Reservation Number *</label>
            <input
              type="text"
              id="reservationNumber"
              name="reservationNumber"
              value={formData.reservationNumber}
              onChange={handleChange}
              maxLength="10"
              placeholder={placeholders.reservationNumber}
              readOnly={isEditMode}
              style={isEditMode ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
            />
            {errors.reservationNumber && <span className="error">{renderError(errors.reservationNumber)}</span>}
            {isEditMode && <small className="field-hint">Reservation number cannot be changed</small>}
          </div>

          <div className="form-group">
            <label htmlFor="date">Date *</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
            />
            {errors.date && <span className="error">{renderError(errors.date)}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="expectedArrivalDate">Expected Arrival Date *</label>
            <input
              type="date"
              id="expectedArrivalDate"
              name="expectedArrivalDate"
              value={formData.expectedArrivalDate}
              onChange={handleChange}
              min={formData.date || getTodayDate()}
            />
            {errors.expectedArrivalDate && <span className="error">{renderError(errors.expectedArrivalDate)}</span>}
          </div>
        </div>

        <div className="form-section">
          <h2>Vendor/Farmer Details</h2>

          <div className="form-group">
            <label htmlFor="customerName">Vendor/Farmer Name *</label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              maxLength="100"
            />
            {errors.customerName && <span className="error">{renderError(errors.customerName)}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="fatherName">Father Name</label>
            <input
              type="text"
              id="fatherName"
              name="fatherName"
              value={formData.fatherName}
              onChange={handleChange}
              maxLength="100"
            />
            {errors.fatherName && <span className="error">{renderError(errors.fatherName)}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="mobile">Mobile Number *</label>
            <input
              type="text"
              id="mobile"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              placeholder={placeholders.mobile}
              maxLength="10"
            />
            {errors.mobile && <span className="error">{renderError(errors.mobile)}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="altMobile">Alternate Mobile</label>
            <input
              type="text"
              id="altMobile"
              name="altMobile"
              value={formData.altMobile}
              onChange={handleChange}
              placeholder={placeholders.altMobile}
              maxLength="10"
            />
            {errors.altMobile && <span className="error">{renderError(errors.altMobile)}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              maxLength="100"
            />
            {errors.email && <span className="error">{renderError(errors.email)}</span>}
          </div>
        </div>

        <div className="form-section">
          <h2>Address Details</h2>

          <div className="form-group">
            <label htmlFor="addressLine1">Village</label>
            <input
              type="text"
              id="addressLine1"
              name="addressLine1"
              value={formData.addressLine1}
              onChange={handleChange}
              maxLength="150"
            />
            {errors.addressLine1 && <span className="error">{renderError(errors.addressLine1)}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="addressLine2">Post Office</label>
            <input
              type="text"
              id="addressLine2"
              name="addressLine2"
              value={formData.addressLine2}
              onChange={handleChange}
              maxLength="150"
            />
            {errors.addressLine2 && <span className="error">{renderError(errors.addressLine2)}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="city">City/Via</label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              maxLength="100"
            />
            {errors.city && <span className="error">{renderError(errors.city)}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="state">State</label>
            <select
              id="state"
              name="state"
              value={formData.state}
              onChange={handleChange}
            >
              <option value="">Select State</option>
              {getStates().map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            {errors.state && <span className="error">{renderError(errors.state)}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="district">District</label>
            <select
              id="district"
              name="district"
              value={formData.district}
              onChange={handleChange}
              disabled={!formData.state}
            >
              <option value="">
                {formData.state ? 'Select District' : 'Select State First'}
              </option>
              {availableDistricts.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
            {errors.district && <span className="error">{renderError(errors.district)}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="pinCode">PIN Code</label>
            <input
              type="text"
              id="pinCode"
              name="pinCode"
              value={formData.pinCode}
              onChange={handleChange}
              placeholder={placeholders.pinCode}
              maxLength="6"
            />
            {errors.pinCode && <span className="error">{renderError(errors.pinCode)}</span>}
          </div>
        </div>

        <div className="form-section">
          <h2>Reservation Details</h2>

          <div className="form-group">
            <label htmlFor="reservationRate">Reservation Rate (₹/quintal) *</label>
            <input
              type="number"
              id="reservationRate"
              name="reservationRate"
              value={formData.reservationRate}
              onChange={handleChange}
              step="0.01"
              min="0"
              readOnly
              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
            />
            {errors.reservationRate && <span className="error">{renderError(errors.reservationRate)}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="reservedQuintal">Reserved Quintal *</label>
            <input
              type="number"
              id="reservedQuintal"
              name="reservedQuintal"
              value={formData.reservedQuintal}
              onChange={handleChange}
              step="0.01"
              min="0"
            />
            {errors.reservedQuintal && <span className="error">{renderError(errors.reservedQuintal)}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="numberOfBags">Number of Bags *</label>
            <input
              type="number"
              id="numberOfBags"
              name="numberOfBags"
              value={formData.numberOfBags}
              onChange={handleChange}
              step="1"
              min="0"
              placeholder={bagsManuallyEdited ? "Enter number of bags" : "Auto-suggested: 2x quintal"}
            />
            {!bagsManuallyEdited && formData.reservedQuintal && (
              <small className="field-hint">💡 Suggested: {Math.round(parseFloat(formData.reservedQuintal || 0) * 2)} bags (2x quintal)</small>
            )}
            {errors.numberOfBags && <span className="error">{renderError(errors.numberOfBags)}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="reservationFee">Reservation Fee (₹) *</label>
            <input
              type="number"
              id="reservationFee"
              name="reservationFee"
              value={formData.reservationFee}
              onChange={handleChange}
              step="0.01"
              min="0"
            />
            {errors.reservationFee && <span className="error">{renderError(errors.reservationFee)}</span>}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn-submit"
            disabled={!isFormValid() || loading}
          >
            {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Reservation' : 'Create Reservation')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateReservation;
