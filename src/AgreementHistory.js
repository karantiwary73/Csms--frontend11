import React, { useState, useEffect, useRef } from 'react';
import './AgreementHistory.css';
import DataTable from './DataTable';
import PrintAgreementLetter from './PrintAgreementLetter';
import { buildApiUrl, API_ENDPOINTS } from './api';

const AgreementHistory = ({ user, token, navigateToView }) => {
  const [agreements, setAgreements] = useState([]);
  const [summary, setSummary] = useState({
    totalAgreements: 0,
    totalBags: 0,
    totalQuintals: 0,
    totalPaldariCost: 0,
    totalPaldariPaid: 0,
    totalPaldariDues: 0
  });
  const [filters, setFilters] = useState({
    agreementNumber: '',
    customerName: '',
    mobile: '',
    village: '',
    postOffice: '',
    city: '',
    district: '',
    dateFrom: '',
    dateTo: ''
  });
  
  // CRITICAL: Use ref to always have latest filter values
  const filtersRef = useRef(filters);
  
  // Keep ref in sync with state
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    hasMore: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedAgreementForPrint, setSelectedAgreementForPrint] = useState(null);

  useEffect(() => {
    // filtersRef starts with empty filters from initial state
    fetchAgreements(1, true);
  }, []);

  const fetchAgreements = async (page = 1, reset = false) => {
    setLoading(true);
    setError('');

    try {
      // ALWAYS use filtersRef.current for latest values
      const currentFilters = filtersRef.current;
      
      // Build query parameters - only include non-empty values
      const queryParams = new URLSearchParams();
      
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value && value.trim()) {
          queryParams.append(key, value.trim());
        }
      });

      queryParams.append('page', page.toString());
      queryParams.append('limit', pagination.limit.toString());

      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.AGREEMENTS_HISTORY)}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch agreements');
      }

      if (reset) {
        setAgreements(result.data);
        setSummary(result.summary);
      } else {
        setAgreements(prev => [...prev, ...result.data]);
      }

      setPagination(result.pagination);

    } catch (err) {
      console.error('Fetch agreements error:', err);
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
    if (loading) return; // Prevent multiple clicks
    // filtersRef is already in sync via useEffect
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchAgreements(1, true);
  };

  const handleReset = () => {
    if (loading) return; // Prevent multiple clicks
    
    const resetFilters = {
      agreementNumber: '',
      customerName: '',
      mobile: '',
      village: '',
      postOffice: '',
      city: '',
      district: '',
      dateFrom: '',
      dateTo: ''
    };
    
    // Update both state and ref
    setFilters(resetFilters);
    filtersRef.current = resetFilters; // Immediate sync
    setPagination(prev => ({ ...prev, page: 1 }));
    
    // Fetch will use filtersRef.current which is now empty
    fetchAgreements(1, true);
  };

  const loadMore = () => {
    if (pagination.hasMore && !loading) {
      fetchAgreements(pagination.page + 1, false);
    }
  };

  const handleAgreementStorage = (agreement) => {
    console.log('Navigate to Agreement Storage:', agreement.agreementId);
    // TODO: Navigate to Agreement Storage page
    alert(`Navigate to Agreement Storage for Agreement #${agreement.agreementId} (Lot: ${agreement.lotNumber})`);
  };

  const handleEditAgreement = (agreement) => {
    console.log('Navigate to Edit Agreement:', agreement.agreementId);
    navigateToView('edit-agreement', {
      agreementId: agreement._id, // Pass MongoDB _id for API calls
      agreementNumber: agreement.agreementId, // Pass display number
      lotNumber: agreement.lotNumber
    });
  };

  const handlePrintLetter = async (agreement) => {
    console.log('Print Agreement Letter called:', agreement);
    console.log('Agreement ID:', agreement.agreementId);
    console.log('Agreement _id:', agreement._id);
    
    if (!agreement._id) {
      console.error('No _id found in agreement object:', agreement);
      alert('Error: Agreement ID not found');
      return;
    }

    try {
      console.log('Fetching agreement details from API...');
      
      // Fetch full agreement details for printing
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.AGREEMENTS)}/${agreement._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('API Response status:', response.status);
      console.log('API Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('Agreement data fetched for print:', result.data);
        
        if (result.success && result.data) {
          setSelectedAgreementForPrint(result.data);
          setShowPrintModal(true);
          console.log('Print modal should now be visible');
        } else {
          console.error('Invalid API response structure:', result);
          alert('Error: Invalid response from server');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to fetch agreement details:', errorData);
        alert(`Failed to fetch agreement details: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching agreement for print:', error);
      alert(`Error loading agreement details: ${error.message}`);
    }
  };

  const closePrintModal = () => {
    console.log('Closing print modal');
    setShowPrintModal(false);
    setSelectedAgreementForPrint(null);
  };

  // Debug logging for modal state
  console.log('AgreementHistory render - showPrintModal:', showPrintModal);
  console.log('AgreementHistory render - selectedAgreementForPrint:', selectedAgreementForPrint ? 'has data' : 'null');

  // Action handlers for DataTable
  const handleActions = {
    storage: handleAgreementStorage,
    edit: handleEditAgreement,
    print: handlePrintLetter
  };

  return (
    <div className="agreement-history">
      <div className="page-header">
        <h2>Agreement History</h2>
        <p>Search, filter, and view all agreements</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Search Section */}
      <div className="search-section">
        <h3>Advanced Search</h3>
        <div className="search-grid">
          <div className="form-group">
            <label>Agreement Number</label>
            <input
              type="text"
              name="agreementNumber"
              value={filters.agreementNumber}
              onChange={handleFilterChange}
              placeholder="Enter agreement number"
            />
          </div>

          <div className="form-group">
            <label>Vendor Name</label>
            <input
              type="text"
              name="customerName"
              value={filters.customerName}
              onChange={handleFilterChange}
              placeholder="Enter vendor name"
            />
          </div>

          <div className="form-group">
            <label>Mobile Number</label>
            <input
              type="text"
              name="mobile"
              value={filters.mobile}
              onChange={handleFilterChange}
              placeholder="Enter mobile number"
            />
          </div>

          <div className="form-group">
            <label>Village</label>
            <input
              type="text"
              name="village"
              value={filters.village}
              onChange={handleFilterChange}
              placeholder="Enter village"
            />
          </div>

          <div className="form-group">
            <label>Post Office</label>
            <input
              type="text"
              name="postOffice"
              value={filters.postOffice}
              onChange={handleFilterChange}
              placeholder="Enter post office"
            />
          </div>

          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              name="city"
              value={filters.city}
              onChange={handleFilterChange}
              placeholder="Enter city"
            />
          </div>

          <div className="form-group">
            <label>District</label>
            <input
              type="text"
              name="district"
              value={filters.district}
              onChange={handleFilterChange}
              placeholder="Enter district"
            />
          </div>

          <div className="form-group">
            <label>From Date</label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
            />
          </div>

          <div className="form-group">
            <label>To Date</label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
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
            <div className="summary-label">Total Agreements</div>
            <div className="summary-value">{summary.totalAgreements.toLocaleString()}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Bags Unloaded</div>
            <div className="summary-value">{summary.totalBags.toLocaleString()}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Quintals</div>
            <div className="summary-value">{summary.totalQuintals.toLocaleString()} Q</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Paldari Cost</div>
            <div className="summary-value">₹{summary.totalPaldariCost.toLocaleString()}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Paldari Paid</div>
            <div className="summary-value">₹{summary.totalPaldariPaid.toLocaleString()}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Paldari Dues</div>
            <div className="summary-value">₹{summary.totalPaldariDues.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="results-section">
        <h3>Agreement Results ({pagination.total} total)</h3>
        
        <DataTable
          data={agreements}
          viewKey="agreement-history"
          loading={loading}
          onActionClick={handleActions}
          userId={user?.id}
          emptyMessage={loading ? 'Loading agreements...' : 'No agreements found'}
          actionButtons={[
            {
              key: 'storage',
              label: 'Storage',
              icon: '📦',
              title: 'Agreement Storage'
            },
            {
              key: 'edit',
              label: 'Edit',
              icon: '✏️',
              title: 'Edit Agreement'
            },
            {
              key: 'print',
              label: 'Print',
              icon: '🖨️',
              title: 'Print Letter'
            }
          ]}
        />

        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ marginTop: '10px', padding: '10px', background: '#f5f5f5', fontSize: '12px' }}>
            <strong>Debug Info:</strong><br />
            Agreements count: {agreements.length}<br />
            Show print modal: {showPrintModal ? 'true' : 'false'}<br />
            Selected agreement: {selectedAgreementForPrint ? 'has data' : 'null'}<br />
            User ID: {user?.id}<br />
            Token: {token ? 'present' : 'missing'}
          </div>
        )}

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

      {/* Print Modal */}
      {showPrintModal && selectedAgreementForPrint && (
        <PrintAgreementLetter 
          agreement={selectedAgreementForPrint}
          user={user}
          onClose={closePrintModal}
        />
      )}
      
      {/* Debug info */}
      {showPrintModal && !selectedAgreementForPrint && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '20px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          zIndex: 9999
        }}>
          <p>Loading agreement data for printing...</p>
          <button onClick={closePrintModal}>Close</button>
        </div>
      )}
    </div>
  );
};

export default AgreementHistory;