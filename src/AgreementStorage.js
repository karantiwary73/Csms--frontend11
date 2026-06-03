import React, { useState, useEffect } from 'react';
import './AgreementStorage.css';
import { buildApiUrl, API_ENDPOINTS } from './api';

const AgreementStorage = ({ user, token, navigationData, navigateToView }) => {
  const [agreement, setAgreement] = useState(null);
  const [storageAllocations, setStorageAllocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Storage form state
  const [storageForm, setStorageForm] = useState({
    level1: '',
    level2: '',
    level3: '',
    numberOfBags: ''
  });

  // Get agreementId from navigation data
  const agreementId = navigationData?.agreementId;

  useEffect(() => {
    if (agreementId) {
      fetchAgreementDetails();
      fetchStorageAllocations();
    }
  }, [agreementId]);

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

      setAgreement(result.data);
    } catch (err) {
      console.error('Fetch agreement error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageAllocations = async () => {
    try {
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.AGREEMENTS)}/${agreementId}/storage`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok) {
        setStorageAllocations(result.data || []);
      }
    } catch (err) {
      console.error('Fetch storage allocations error:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-capitalize for level1, level2, level3 fields
    let processedValue = value;
    if (name === 'level1' || name === 'level2' || name === 'level3') {
      processedValue = value.toUpperCase();
    }
    
    setStorageForm(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleAddStorage = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!storageForm.level1 || !storageForm.level2 || !storageForm.level3 || !storageForm.numberOfBags) {
      setError('All fields are required');
      return;
    }

    const numberOfBags = parseInt(storageForm.numberOfBags);
    if (isNaN(numberOfBags) || numberOfBags <= 0) {
      setError('Number of bags must be a positive integer');
      return;
    }

    // Check if total allocated bags would exceed agreement bags
    const totalAllocated = storageAllocations.reduce((sum, alloc) => sum + alloc.numberOfBags, 0);
    const remainingBags = agreement.numberOfBags - totalAllocated;
    
    if (numberOfBags > remainingBags) {
      setError(`Cannot allocate ${numberOfBags} bags. Only ${remainingBags} bags remaining.`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.AGREEMENTS)}/${agreementId}/storage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          level1: storageForm.level1,
          level2: storageForm.level2,
          level3: storageForm.level3,
          numberOfBags: numberOfBags
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add storage allocation');
      }

      setSuccess('Storage allocation added successfully!');
      setStorageForm({
        level1: '',
        level2: '',
        level3: '',
        numberOfBags: ''
      });
      
      // Refresh storage allocations
      fetchStorageAllocations();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Add storage error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStorage = async (storageId) => {
    if (!window.confirm('Are you sure you want to delete this storage allocation?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.AGREEMENTS)}/${agreementId}/storage/${storageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete storage allocation');
      }

      setSuccess('Storage allocation deleted successfully!');
      fetchStorageAllocations();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Delete storage error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalAllocated = storageAllocations.reduce((sum, alloc) => sum + alloc.numberOfBags, 0);
  const remainingBags = agreement ? agreement.numberOfBags - totalAllocated : 0;
  const isFullyAllocated = remainingBags === 0;

  if (!agreementId) {
    return (
      <div className="agreement-storage">
        <div className="error-message">No agreement selected. Please select an agreement from the overview.</div>
      </div>
    );
  }

  if (loading && !agreement) {
    return (
      <div className="agreement-storage">
        <div className="loading">Loading agreement details...</div>
      </div>
    );
  }

  if (error && !agreement) {
    return (
      <div className="agreement-storage">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="agreement-storage">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2>📦 Agreement Storage</h2>
            <p>Assign physical storage location for goods under an agreement</p>
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

      {/* Agreement Header (Read-only) */}
      {agreement && (
        <div className="agreement-header">
          <h3>Agreement Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Agreement Number:</label>
              <span>{agreement.agreementId || '-'}</span>
            </div>
            <div className="info-item">
              <label>Name:</label>
              <span>{agreement.reservation?.customerName || agreement.customerName || '-'}</span>
            </div>
            <div className="info-item">
              <label>Father's Name:</label>
              <span>{agreement.reservation?.fatherName || agreement.fatherName || '-'}</span>
            </div>
            <div className="info-item">
              <label>Product Name:</label>
              <span>{agreement.product || '-'}</span>
            </div>
            <div className="info-item">
              <label>Address Line 1:</label>
              <span>{agreement.reservation?.addressLine1 || agreement.addressLine1 || '-'}</span>
            </div>
            <div className="info-item">
              <label>Address Line 2:</label>
              <span>{agreement.reservation?.addressLine2 || agreement.addressLine2 || '-'}</span>
            </div>
            <div className="info-item">
              <label>District:</label>
              <span>{agreement.reservation?.district || agreement.district || '-'}</span>
            </div>
            <div className="info-item">
              <label>State:</label>
              <span>{agreement.reservation?.state || agreement.state || '-'}</span>
            </div>
            <div className="info-item">
              <label>PIN Code:</label>
              <span>{agreement.reservation?.pinCode || agreement.pinCode || '-'}</span>
            </div>
            <div className="info-item">
              <label>Weight (Quintals):</label>
              <span>{agreement.weightInQuintal || '-'}</span>
            </div>
            <div className="info-item">
              <label>Total Number of Bags:</label>
              <span className="highlight">{agreement.numberOfBags}</span>
            </div>
            <div className="info-item">
              <label>Allocated Bags:</label>
              <span className={isFullyAllocated ? 'success' : 'warning'}>{totalAllocated}</span>
            </div>
            <div className="info-item">
              <label>Remaining Bags:</label>
              <span className={remainingBags === 0 ? 'success' : 'warning'}>{remainingBags}</span>
            </div>
          </div>
        </div>
      )}

      {/* Storage Information Entry */}
      <div className="storage-entry-section">
        <h3>Add Storage Allocation</h3>
        <form onSubmit={handleAddStorage} className="storage-form">
          <div className="form-row">
            <div className="form-group">
              <label>Chamber *</label>
              <input
                type="text"
                name="level1"
                value={storageForm.level1}
                onChange={handleInputChange}
                maxLength={6}
                placeholder="Enter chamber"
                disabled={loading || isFullyAllocated}
              />
            </div>
            <div className="form-group">
              <label>Floor *</label>
              <input
                type="text"
                name="level2"
                value={storageForm.level2}
                onChange={handleInputChange}
                maxLength={6}
                placeholder="Enter floor"
                disabled={loading || isFullyAllocated}
              />
            </div>
            <div className="form-group">
              <label>Khataal *</label>
              <input
                type="text"
                name="level3"
                value={storageForm.level3}
                onChange={handleInputChange}
                maxLength={6}
                placeholder="Enter khataal"
                disabled={loading || isFullyAllocated}
              />
            </div>
            <div className="form-group">
              <label>Number of Bags *</label>
              <input
                type="number"
                name="numberOfBags"
                value={storageForm.numberOfBags}
                onChange={handleInputChange}
                min="1"
                max={remainingBags}
                placeholder="Enter bags"
                disabled={loading || isFullyAllocated}
              />
            </div>
            <div className="form-group">
              <button 
                type="submit" 
                className="btn-add"
                disabled={loading || isFullyAllocated}
              >
                {loading ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
          {isFullyAllocated && (
            <div className="info-message">All bags have been allocated to storage.</div>
          )}
        </form>
      </div>

      {/* Storage Allocation Table */}
      <div className="storage-table-section">
        <h3>Storage Allocations</h3>
        {storageAllocations.length === 0 ? (
          <div className="no-data">No storage allocations yet. Add storage locations above.</div>
        ) : (
          <div className="table-container">
            <table className="storage-table">
              <thead>
                <tr>
                  <th>Chamber</th>
                  <th>Floor</th>
                  <th>Khataal</th>
                  <th>Number of Bags</th>
                  <th>Created On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {storageAllocations.map((allocation) => (
                  <tr key={allocation._id}>
                    <td>{allocation.level1}</td>
                    <td>{allocation.level2}</td>
                    <td>{allocation.level3}</td>
                    <td className="number">{allocation.numberOfBags}</td>
                    <td>{new Date(allocation.createdOn).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteStorage(allocation._id)}
                        className="btn-delete"
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan="3"><strong>Total Allocated</strong></td>
                  <td className="number"><strong>{totalAllocated}</strong></td>
                  <td colSpan="2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgreementStorage;
