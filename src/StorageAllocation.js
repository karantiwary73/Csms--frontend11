import React, { useState, useMemo } from 'react';
import './StorageAllocation.css';
import { buildApiUrl, API_ENDPOINTS } from './api';

const StorageAllocation = ({ user, token }) => {
  // Memoized placeholder values to prevent recalculation during re-renders
  const placeholders = useMemo(() => ({
    agreementNumber: "Enter agreement number",
    chamber: "Select Chamber",
    floor: "Select Floor", 
    khataal: "Select Khataal",
    bags: "Number of Bags"
  }), []);

  const [searchNumber, setSearchNumber] = useState('');
  const [agreement, setAgreement] = useState(null);
  const [storageAllocations, setStorageAllocations] = useState([]);
  const [transferHistory, setTransferHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('current'); // current, history
  
  // Storage form state
  const [storageForm, setStorageForm] = useState({
    level1: '',
    level2: '',
    level3: '',
    numberOfBags: ''
  });

  // Relocation state
  const [isInRelocation, setIsInRelocation] = useState(false);
  const [relocationBags, setRelocationBags] = useState(0);
  const [preRelocationAllocations, setPreRelocationAllocations] = useState([]);
  const [hasCompletedRelocation, setHasCompletedRelocation] = useState(false);

  const handleSearch = async () => {
    if (!searchNumber.trim()) {
      setError('Please enter an agreement number');
      return;
    }

    setLoading(true);
    setError('');
    setAgreement(null);
    setStorageAllocations([]);
    setTransferHistory([]);
    setPreRelocationAllocations([]);
    setIsInRelocation(false);
    setHasCompletedRelocation(false);

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
      console.log('🔍 Found agreement:', foundAgreement);
      console.log('🔍 Agreement _id to use for storage fetch:', foundAgreement._id);
      setAgreement(foundAgreement);

      // Fetch storage allocations for this agreement
      console.log('🔄 Calling fetchStorageAllocations with:', foundAgreement._id);
      await fetchStorageAllocations(foundAgreement._id);
      
      // Fetch transfer history
      await fetchTransferHistory(foundAgreement._id);

    } catch (err) {
      console.error('Search error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOutForRelocationAllocations = async (agreementId) => {
    try {
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.AGREEMENTS)}/${agreementId}/storage/out-for-relocation`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok) {
        console.log('📦 Out for relocation allocations fetched:', result.data);
        return result.data || [];
      } else {
        console.error('❌ Failed to fetch out for relocation allocations:', result.error);
        return [];
      }
    } catch (err) {
      console.error('Fetch out for relocation allocations error:', err);
      return [];
    }
  };

  const fetchStorageAllocations = async (agreementId) => {
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      
      console.log('🔍 fetchStorageAllocations called with agreementId:', agreementId);
      
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.AGREEMENTS)}/${agreementId}/storage?_t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 API Response status:', response.status);
      console.log('📡 API Response ok:', response.ok);

      const result = await response.json();
      console.log('📦 API Response data:', result);

      if (response.ok) {
        console.log('✅ Storage allocations fetched successfully:', result.data);
        console.log('📊 Number of allocations:', result.data ? result.data.length : 0);
        
        // Debug: Log each allocation to see if relocation fields are present
        if (result.data && result.data.length > 0) {
          result.data.forEach((allocation, index) => {
            console.log(`Allocation ${index}:`, {
              id: allocation._id,
              location: `${allocation.level1}/${allocation.level2}/${allocation.level3}`,
              bags: allocation.numberOfBags,
              createdBy: allocation.createdBy,
              relocatedBy: allocation.relocatedBy,
              relocatedOn: allocation.relocatedOn,
              relocationStatus: allocation.relocationStatus
            });
          });
        } else {
          console.log('⚠️ No allocations in response data');
        }
        
        setStorageAllocations(result.data || []);
        console.log('🔄 setStorageAllocations called with:', result.data || []);
        
        // Check if this agreement has completed any relocations
        await checkForCompletedRelocations(agreementId);
      } else {
        console.error('❌ API response not ok:', result);
        setStorageAllocations([]);
      }
    } catch (err) {
      console.error('❌ Fetch storage allocations error:', err);
      setStorageAllocations([]);
    }
  };

  const checkForCompletedRelocations = async (agreementId) => {
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      
      // Fetch all allocations including relocated ones to check completion status
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.AGREEMENTS)}/${agreementId}/storage?includeAll=true&_t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok) {
        // AUDIT RULE: Check if any allocations have isRelocated = true
        const allAllocations = result.data;
        const relocatedAllocations = allAllocations.filter(allocation => 
          allocation.isRelocated === true
        );
        const activeAllocations = allAllocations.filter(allocation => 
          allocation.relocationStatus === 'active' || !allocation.relocationStatus
        );
        
        // BUSINESS RULE: If any allocation has isRelocated = true, disable button permanently
        const hasCompletedRelocation = relocatedAllocations.length > 0;
        
        console.log('🔍 Checking for completed relocations (AUDIT COMPLIANT):');
        console.log(`   📦 Total allocations: ${allAllocations.length}`);
        console.log(`   ✅ Relocated allocations (isRelocated=true): ${relocatedAllocations.length}`);
        console.log(`   🔄 Active allocations: ${activeAllocations.length}`);
        console.log(`   🎯 Button should be disabled: ${hasCompletedRelocation}`);
        
        setHasCompletedRelocation(hasCompletedRelocation);
      }
    } catch (err) {
      console.error('Check completed relocations error:', err);
      // Don't fail the whole operation if this check fails
      setHasCompletedRelocation(false);
    }
  };

  const fetchTransferHistory = async (agreementId) => {
    try {
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.AGREEMENTS)}/${agreementId}/storage/transfers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok) {
        setTransferHistory(result.data || []);
      }
    } catch (err) {
      console.error('Fetch transfer history error:', err);
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

    // Check bag limits based on mode
    let maxAllowedBags;
    if (isInRelocation) {
      // In relocation mode: can only allocate from relocation bags
      maxAllowedBags = relocationBags;
      if (numberOfBags > relocationBags) {
        setError(`Cannot allocate ${numberOfBags} bags. Only ${relocationBags} bags available for relocation.`);
        return;
      }
    } else {
      // Normal mode: check against remaining unallocated bags
      const totalAllocated = storageAllocations.reduce((sum, alloc) => sum + alloc.numberOfBags, 0);
      const remainingBags = agreement.numberOfBags - totalAllocated;
      maxAllowedBags = remainingBags;
      
      if (numberOfBags > remainingBags) {
        setError(`Cannot allocate ${numberOfBags} bags. Only ${remainingBags} bags remaining.`);
        return;
      }
    }

    setLoading(true);

    try {
      // Step 1: Create the storage allocation
      const url = isInRelocation 
        ? `${buildApiUrl(API_ENDPOINTS.AGREEMENTS)}/${agreement._id}/storage?relocation=true`
        : `${buildApiUrl(API_ENDPOINTS.AGREEMENTS)}/${agreement._id}/storage`;
      
      console.log('🔧 Frontend: Making storage allocation request');
      console.log('  - URL:', url);
      console.log('  - isInRelocation:', isInRelocation);
      console.log('  - Request body:', {
        level1: storageForm.level1,
        level2: storageForm.level2,
        level3: storageForm.level3,
        numberOfBags: numberOfBags
      });
        
      const response = await fetch(url, {
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

      // Step 2: If in relocation mode, log the reallocation
      if (isInRelocation) {
        try {
          const logResponse = await fetch(`${buildApiUrl(API_ENDPOINTS.AGREEMENTS)}/${agreement._id}/storage/relocation/allocate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              storageAllocationId: result.data._id
            })
          });

          if (logResponse.ok) {
            const logResult = await logResponse.json();
            console.log('✅ Relocation allocation logged:', logResult.data);
          } else {
            console.warn('⚠️ Failed to log relocation allocation, but allocation was successful');
          }
        } catch (logError) {
          console.warn('⚠️ Relocation logging error:', logError.message);
          // Don't fail the whole operation if logging fails
        }
      }

      // Step 3: Update state and show success message
      if (isInRelocation) {
        const newRelocationBags = relocationBags - numberOfBags;
        setRelocationBags(newRelocationBags);
        
        // If all bags are reallocated, complete the relocation process
        if (newRelocationBags === 0) {
          try {
            // Call API to complete relocation (mark old allocations as relocated)
            const completeResponse = await fetch(`${buildApiUrl(API_ENDPOINTS.AGREEMENTS)}/${agreement._id}/storage/relocation/complete`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (completeResponse.ok) {
              console.log('✅ Relocation completed successfully');
              // Force refresh to get updated data with isRelocated flags
              await fetchStorageAllocations(agreement._id);
              // Check for completed relocations to update button state
              await checkForCompletedRelocations(agreement._id);
            } else {
              console.warn('⚠️ Failed to complete relocation, but allocation was successful');
            }
          } catch (completeError) {
            console.warn('⚠️ Relocation completion error:', completeError.message);
            // Don't fail the whole operation if completion fails
          }

          setIsInRelocation(false);
          setPreRelocationAllocations([]); // Clear pre-relocation data
          setSuccess('All bags successfully reallocated! Relocation complete. Original location data has been preserved for audit purposes.');
        } else {
          setSuccess(`${numberOfBags} bags allocated and logged. ${newRelocationBags} bags remaining to reallocate.`);
        }
      } else {
        setSuccess('Storage allocation added successfully!');
      }
      
      setStorageForm({
        level1: '',
        level2: '',
        level3: '',
        numberOfBags: ''
      });
      
      // Refresh storage allocations
      await fetchStorageAllocations(agreement._id);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Add storage error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRelocation = async () => {
    if (!window.confirm('This will mark ALL bags as out for relocation. The original location data will be preserved. Are you sure?')) {
      return;
    }

    // Check if there are any storage allocations to relocate
    if (!storageAllocations || storageAllocations.length === 0) {
      setError('No storage allocations found to relocate. Please ensure bags are allocated to storage locations first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Calculate total bags currently in storage
      const totalBagsInStorage = storageAllocations.reduce((sum, alloc) => sum + alloc.numberOfBags, 0);
      
      if (totalBagsInStorage === 0) {
        setError('No bags in storage to relocate');
        return;
      }

      console.log('🔄 Starting relocation for agreement:', agreement._id);
      console.log('📦 Total bags in storage:', totalBagsInStorage);
      console.log('📋 Storage allocations:', storageAllocations.length);
      console.log('🔑 Token preview:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
      
      // Call the new relocation start API
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.AGREEMENTS)}/${agreement._id}/storage/relocation/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 Response status:', response.status);
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('📊 Response ok:', response.ok);

      // Read response text first (can only be done once)
      const responseText = await response.text();
      console.log('📊 Raw response text:', responseText);

      if (!response.ok) {
        let errorResult;
        
        try {
          // Try to parse as JSON
          errorResult = JSON.parse(responseText);
          console.error('❌ Parsed error response:', JSON.stringify(errorResult, null, 2));
        } catch (parseError) {
          console.error('❌ Failed to parse error response as JSON:', parseError);
          throw new Error(`Server error (${response.status}): ${responseText || 'Unknown error'}`);
        }
        
        const errorMessage = errorResult.error || errorResult.message || errorResult.details || 'Failed to start relocation';
        console.error('❌ Final error message:', errorMessage);
        
        // If the error contains suggestions about other agreements, show them
        if (errorResult.details && errorResult.details.includes('Found active allocations in:')) {
          const suggestionMatch = errorResult.details.match(/Found active allocations in: (.+)/);
          if (suggestionMatch) {
            const suggestions = suggestionMatch[1];
            throw new Error(`No active allocations found for this agreement.\n\nSuggestion: Try one of these agreements with active allocations:\n${suggestions}`);
          }
        }
        
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = JSON.parse(responseText);
        console.log('✅ Relocation started successfully');
        console.log('📊 Full response:', JSON.stringify(result, null, 2));
        console.log('📊 Result data:', result.data);
      } catch (jsonError) {
        console.error('❌ Failed to parse success response as JSON:', jsonError);
        console.error('❌ Response text was:', responseText);
        throw new Error('Failed to parse server response');
      }

      // Store the pre-relocation allocations for display
      setPreRelocationAllocations(result.data.preRelocationAllocations || [...storageAllocations]);

      // Set relocation mode
      setIsInRelocation(true);
      setRelocationBags(result.data.totalBags || totalBagsInStorage);
      
      // Refresh storage allocations (should now exclude out-for-relocation items)
      await fetchStorageAllocations(agreement._id);
      
      setSuccess(`${result.data.totalBags} bags marked as out for relocation. Original location data preserved. Use the form below to reallocate them.`);
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Start relocation error:', err);
      
      // Better error message handling
      let errorMessage = 'Failed to start relocation process';
      if (err.message) {
        errorMessage += ': ' + err.message;
      } else if (typeof err === 'string') {
        errorMessage += ': ' + err;
      } else {
        errorMessage += ': Unknown error occurred';
      }
      
      setError(errorMessage);
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
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.AGREEMENTS)}/${agreement._id}/storage/${storageId}`, {
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
      await fetchStorageAllocations(agreement._id);
      
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
  const remainingBags = isInRelocation ? relocationBags : (agreement ? agreement.numberOfBags - totalAllocated : 0);
  const isFullyAllocated = !isInRelocation && remainingBags === 0 && totalAllocated > 0; // Only show if there are actual allocations
  
  // AUDIT RULE: Button disable logic based on isRelocated flag
  // Button should be disabled if ANY allocation has isRelocated = true
  const isFullyRelocated = hasCompletedRelocation;

  return (
    <div className="storage-allocation">
      <div className="page-header">
        <h2>🔄 Storage Allocation & Transfer</h2>
        <p>Manage physical movement and re-allocation of stored bags</p>
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
            className="btn-proceed"
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Proceed'}
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
            <div className="info-grid">
              <div className="info-item">
                <label>Agreement Number:</label>
                <span>{agreement.agreementId}</span>
              </div>
              <div className="info-item">
                <label>Lot Number:</label>
                <span>{agreement.lotNumber}</span>
              </div>
              <div className="info-item">
                <label>Vendor Name:</label>
                <span>{agreement.customerName || '-'}</span>
              </div>
              <div className="info-item">
                <label>Father's Name:</label>
                <span>{agreement.fatherName || '-'}</span>
              </div>
              <div className="info-item">
                <label>Mobile:</label>
                <span>{agreement.mobile || '-'}</span>
              </div>
              <div className="info-item">
                <label>Village:</label>
                <span>{agreement.addressLine1 || '-'}</span>
              </div>
              <div className="info-item">
                <label>Total Weight (Quintals):</label>
                <span>{agreement.weightInQuintal}</span>
              </div>
              <div className="info-item">
                <label>Total Number of Bags:</label>
                <span className="highlight">{agreement.numberOfBags}</span>
              </div>
            </div>
          </div>

          {/* Relocation Status */}
          {isInRelocation && (
            <div className="relocation-status">
              <h3>🔄 Relocation in Progress</h3>
              <div className="relocation-info">
                <p><strong>{relocationBags} bags</strong> are currently out of storage and need to be reallocated.</p>
              </div>
            </div>
          )}

          {/* Currently Allocated Space */}
          <div className="allocated-space-section-simple">
            <h3>Currently Allocated Space:</h3>
            
            {(storageAllocations.length > 0 || (isInRelocation && preRelocationAllocations.length > 0)) ? (
              <div className="simple-table-wrapper">
                <table className="allocation-simple-table">
                  <thead>
                    <tr>
                      <th>Chamber</th>
                      <th>Floor</th>
                      <th>Khataal</th>
                      <th>Number of Bags</th>
                      <th>{hasCompletedRelocation ? 'Relocated By' : 'Created By'}</th>
                      <th>{hasCompletedRelocation ? 'Relocated On' : 'Created On'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isInRelocation ? (
                      // During relocation, show pre-relocation data with status
                      preRelocationAllocations.map((allocation) => (
                        <tr key={allocation._id} style={{ backgroundColor: '#fff3cd' }}>
                          <td>{allocation.level1}</td>
                          <td>{allocation.level2}</td>
                          <td>{allocation.level3}</td>
                          <td>{allocation.numberOfBags}</td>
                          <td>{allocation.createdBy || '-'}</td>
                          <td>{new Date(allocation.createdOn).toLocaleString()}</td>
                          <td>-</td>
                          <td>-</td>
                          <td><span style={{ color: '#856404', fontWeight: 'bold' }}>OUT FOR RELOCATION</span></td>
                        </tr>
                      ))
                    ) : (
                      // Normal mode, show current allocations with conditional audit trail display
                      storageAllocations.map((allocation) => (
                        <tr key={allocation._id} style={{ 
                          backgroundColor: allocation.isRelocated ? '#d1ecf1' : 'transparent' 
                        }}>
                          <td>{allocation.level1}</td>
                          <td>{allocation.level2}</td>
                          <td>{allocation.level3}</td>
                          <td>{allocation.numberOfBags}</td>
                          <td>
                            {hasCompletedRelocation ? (
                              allocation.updatedBy ? (
                                <span style={{ color: '#007bff', fontWeight: 'bold' }}>
                                  {allocation.updatedBy}
                                </span>
                              ) : '-'
                            ) : (
                              allocation.createdBy || '-'
                            )}
                          </td>
                          <td>
                            {hasCompletedRelocation ? (
                              allocation.updatedDate ? (
                                <span style={{ color: '#007bff', fontWeight: 'bold' }}>
                                  {new Date(allocation.updatedDate).toLocaleString()}
                                </span>
                              ) : '-'
                            ) : (
                              new Date(allocation.createdOn).toLocaleString()
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                
                {!isInRelocation && (
                  <>
                    {isFullyAllocated ? (
                      <div className="allocation-complete-message">
                        <span className="checkmark">✓</span> All bags have been allocated to storage
                        {hasCompletedRelocation ? (
                          <div className="relocation-completed-message">
                            <span className="checkmark">✓</span> Relocation completed
                          </div>
                        ) : (
                          <button 
                            onClick={handleStartRelocation}
                            className="btn-relocate"
                            disabled={loading || isFullyRelocated}
                            style={{ marginLeft: '20px' }}
                            title={isFullyRelocated ? 'Relocation already completed for this agreement' : 'Start relocation process'}
                          >
                            {isFullyRelocated ? 'All Bags Relocated' : 'Start Relocation'}
                          </button>
                        )}
                      </div>
                    ) : totalAllocated === 0 ? (
                      <div className="bags-remaining-info">
                        <span style={{ color: '#856404' }}>⚠️ No bags allocated yet. Please allocate bags to storage locations first.</span>
                      </div>
                    ) : remainingBags < 0 ? (
                      <div className="bags-remaining-info">
                        <span style={{ color: 'red' }}>⚠️ Over-allocated: {Math.abs(remainingBags)} bags over the agreement total of {agreement.numberOfBags}</span>
                      </div>
                    ) : (
                      <div className="bags-remaining-info">
                        {remainingBags} out of {agreement.numberOfBags} bags still left to accommodate
                        {/* Removed Start Relocation button from here - only show when fully allocated */}
                      </div>
                    )}
                  </>
                )}
                
                {isInRelocation && (
                  <div className="relocation-table-info">
                    <p style={{ color: '#856404', fontStyle: 'italic', marginTop: '10px' }}>
                      ℹ️ Showing original locations before relocation started. All bags are currently out for reallocation. Original data is preserved and can be restored if needed.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-allocations-message">
                <p>No storage allocated yet.</p>
              </div>
            )}
          </div>

          {/* Allocate New Space / Reallocate during Relocation */}
          {((!isFullyAllocated && remainingBags > 0) || isInRelocation) && (
            <div className="allocate-new-section">
              <h3>{isInRelocation ? 'Reallocate Bags (Relocation Mode)' : 'Allocate New Space'}</h3>
              
              {isInRelocation && (
                <div className="relocation-progress">
                  <p><strong>Bags to reallocate: {relocationBags}</strong></p>
                </div>
              )}
              
              <form onSubmit={handleAddStorage} className="inline-allocation-form">
                <div className="form-fields-row">
                  <div className="form-field">
                    <label>Select Chamber</label>
                    <input
                      type="text"
                      name="level1"
                      value={storageForm.level1}
                      onChange={handleInputChange}
                      placeholder={placeholders.chamber}
                      maxLength={6}
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Select Floor</label>
                    <input
                      type="text"
                      name="level2"
                      value={storageForm.level2}
                      onChange={handleInputChange}
                      placeholder={placeholders.floor}
                      maxLength={6}
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Select Khataal</label>
                    <input
                      type="text"
                      name="level3"
                      value={storageForm.level3}
                      onChange={handleInputChange}
                      placeholder={placeholders.khataal}
                      maxLength={6}
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Number of Bags</label>
                    <input
                      type="number"
                      name="numberOfBags"
                      value={storageForm.numberOfBags}
                      onChange={handleInputChange}
                      placeholder={placeholders.bags}
                      min="1"
                      max={remainingBags}
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <button 
                      type="submit" 
                      className="btn-push"
                      disabled={loading}
                    >
                      {isInRelocation ? 'Push Back' : 'Push'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Current Allocations Table */}
              {storageAllocations.length > 0 && !isInRelocation && (
                <div className="current-allocations-table">
                  <table className="simple-table">
                    <thead>
                      <tr>
                        <th>Chamber</th>
                        <th>Floor</th>
                        <th>Khataal</th>
                        <th>Number of Bags</th>
                        <th>Created By</th>
                        <th>Created On</th>
                        <th>Updated By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storageAllocations.map((allocation) => (
                        <tr key={allocation._id}>
                          <td>{allocation.level1}</td>
                          <td>{allocation.level2}</td>
                          <td>{allocation.level3}</td>
                          <td>{allocation.numberOfBags}</td>
                          <td>{allocation.createdBy || '-'}</td>
                          <td>{new Date(allocation.createdOn).toLocaleString()}</td>
                          <td>{allocation.updatedBy || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="table-footer">
                    <button 
                      className="btn-clear-table"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to clear all storage allocations?')) {
                          // Clear all allocations
                          storageAllocations.forEach(async (allocation) => {
                            await handleDeleteStorage(allocation._id);
                          });
                        }
                      }}
                    >
                      clear table
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
          <p>👆 Enter an agreement number above to begin storage allocation</p>
        </div>
      )}
    </div>
  );
};

export default StorageAllocation;
