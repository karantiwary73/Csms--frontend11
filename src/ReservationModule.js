import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './ReservationModule.css';
import DataTable from './DataTable';
import { buildApiUrl, API_ENDPOINTS } from './api';

/**
 * Unified Enterprise-Grade Reservation Module
 * 
 * Features:
 * - Centralized column management with system defaults
 * - History and Comparison views with tab-based switching
 * - User preferences per view with persistence
 * - Sticky columns and visual hierarchy
 * - No horizontal scrolling in default view
 * - Consistent layout across views
 * 
 * Requirements: 2.1-2.12, 3.1-3.7, 5.1-5.6, 8.1-8.5, 9.1-9.8, 11.1-11.5
 */
const ReservationModule = ({ user, token, navigateToView }) => {
  // View state
  const [currentView, setCurrentView] = useState('history'); // 'history' or 'comparison'
  
  // Data state
  const [reservations, setReservations] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [summary, setSummary] = useState({
    totalReservations: 0,
    totalReservationFee: 0,
    totalReservedQuintal: 0,
    totalNumberOfBags: 0
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Memoized placeholder values to prevent recalculation during re-renders
  const placeholders = useMemo(() => ({
    reservationNumber: "Enter reservation number",
    customerName: "Enter vendor name",
    mobile: "Enter mobile", 
    village: "Enter village"
  }), []);

  // Filter state
  const [filters, setFilters] = useState({
    reservationNumber: '',
    reservationNumberFrom: '',
    reservationNumberTo: '',
    customerName: '',
    mobile: '',
    village: '',
    dateFrom: '',
    dateTo: ''
  });

  // Custom renderers for specific columns
  const customRenderers = {
    reservationNumber: (item) => (
      <div className="cell-content">
        <div className="primary-text">{item.reservationNumber}</div>
        {item.date && (
          <div className="secondary-text">
            {new Date(item.date).toLocaleDateString('en-IN')}
          </div>
        )}
      </div>
    ),
    
    vendorName: (item) => (
      <div className="cell-content">
        <div className="primary-text">{item.customerName}</div>
        {item.email && (
          <div className="secondary-text">{item.email}</div>
        )}
      </div>
    ),
    
    mobile: (item) => (
      <div className="cell-content">
        <div className="primary-text">{item.mobile}</div>
        {item.altMobile && (
          <div className="secondary-text">{item.altMobile}</div>
        )}
      </div>
    ),
    
    difference: (item) => {
      const diff = (item.arrivedQuintal || 0) - item.reservedQuintal;
      return (
        <div className={`cell-content difference ${diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral'}`}>
          <div className="primary-text">
            {diff > 0 ? '+' : ''}{diff}
          </div>
        </div>
      );
    },
    
    status: (item) => {
      if (currentView === 'comparison') {
        const status = getArrivalStatus(item.reservedQuintal, item.arrivedQuintal);
        return (
          <span
            className="status-badge"
            style={{ backgroundColor: getStatusColor(status) }}
          >
            {status}
          </span>
        );
      }
      return '--';
    },
    
    action: (item) => (
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <button 
          type="button"
          className="btn-action primary"
          onClick={(e) => {
            e.stopPropagation();
            handleEditReservation(item);
          }}
          title="Edit this reservation"
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: '2px solid #007bff',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          EDIT
        </button>
        <button 
          className="btn-action success"
          onClick={(e) => {
            e.stopPropagation();
            handleCreateAgreement(item);
          }}
          title="Create Agreement for this reservation"
        >
          Create Agreement
        </button>
      </div>
    )
  };

  // Fetch history data
  const fetchHistory = useCallback(async (pageNum = 1, reset = false) => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      const activeFilters = {};
      if (filters.reservationNumber) activeFilters.reservationNumber = filters.reservationNumber;
      if (filters.reservationNumberFrom) activeFilters.reservationNumberFrom = filters.reservationNumberFrom;
      if (filters.reservationNumberTo) activeFilters.reservationNumberTo = filters.reservationNumberTo;
      if (filters.customerName) activeFilters.customerName = filters.customerName;
      if (filters.mobile) activeFilters.mobile = filters.mobile;
      if (filters.village) activeFilters.village = filters.village;
      if (filters.dateFrom) activeFilters.dateFrom = filters.dateFrom;
      if (filters.dateTo) activeFilters.dateTo = filters.dateTo;
      
      const queryParams = new URLSearchParams({
        page: pageNum,
        limit: 100,
        _t: Date.now(), // Cache buster
        ...activeFilters
      });

      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.RESERVATIONS_HISTORY)}?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch history');

      const data = await response.json();

      if (reset) {
        setReservations(data.data);
        setSummary(data.summary);
      } else {
        setReservations(prev => [...prev, ...data.data]);
      }

      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch comparison data
  const fetchComparison = useCallback(async (pageNum = 1, reset = false) => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      const activeFilters = {};
      if (filters.reservationNumber) activeFilters.reservationNumber = filters.reservationNumber;
      if (filters.reservationNumberFrom) activeFilters.reservationNumberFrom = filters.reservationNumberFrom;
      if (filters.reservationNumberTo) activeFilters.reservationNumberTo = filters.reservationNumberTo;
      if (filters.customerName) activeFilters.customerName = filters.customerName;
      if (filters.mobile) activeFilters.mobile = filters.mobile;
      if (filters.village) activeFilters.village = filters.village;
      if (filters.dateFrom) activeFilters.dateFrom = filters.dateFrom;
      if (filters.dateTo) activeFilters.dateTo = filters.dateTo;
      
      const queryParams = new URLSearchParams({
        page: pageNum,
        limit: 100,
        _t: Date.now(), // Cache buster
        ...activeFilters
      });

      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.RESERVATIONS_AGR_VS_RES)}?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch comparison data');

      const data = await response.json();

      if (reset) {
        setComparisons(data.data);
        console.log('🔍 Comparison API Response:', data);
        console.log('📊 Summary received:', data.summary);
        
        // Use the backend summary data directly - it already calculates from ALL matching records
        const summaryData = {
          totalReservations: data.summary?.totalReservations || data.data.length,
          totalReservationFee: data.summary?.totalReservationFee || 0,
          totalReservedQuintal: data.summary?.totalReservedQuintal || 0,
          totalArrivedBags: data.summary?.totalArrivedBags || 0, // Use totalArrivedBags for comparison view
          // Add comparison-specific summary fields
          totalArrivedQuintal: data.summary?.totalArrivedQuintal || 0,
          totalAgreementFee: data.summary?.totalAgreementFee || 0
        };
        
        setSummary(summaryData);
        console.log('📈 Summary set to:', summaryData);
      } else {
        setComparisons(prev => [...prev, ...data.data]);
      }

      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Handle view change
  const handleViewChange = (view) => {
    if (view === currentView) return;
    
    setCurrentView(view);
    setPage(1);
    
    if (view === 'history') {
      setReservations([]);
      fetchHistory(1, true);
    } else {
      setComparisons([]);
      fetchComparison(1, true);
    }
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Apply filters
  const handleApplyFilters = () => {
    setPage(1);
    if (currentView === 'history') {
      setReservations([]);
      fetchHistory(1, true);
    } else {
      setComparisons([]);
      fetchComparison(1, true);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      reservationNumber: '',
      reservationNumberFrom: '',
      reservationNumberTo: '',
      customerName: '',
      mobile: '',
      village: '',
      dateFrom: '',
      dateTo: ''
    });
    
    setPage(1);
    if (currentView === 'history') {
      setReservations([]);
      fetchHistory(1, true);
    } else {
      setComparisons([]);
      fetchComparison(1, true);
    }
  };

  // Handle infinite scroll
  const handleLoadMore = () => {
    if (currentView === 'history') {
      fetchHistory(page + 1, false);
    } else {
      fetchComparison(page + 1, false);
    }
  };

  // Handle create agreement
  const handleCreateAgreement = (reservation) => {
    console.log('📋 Navigating to Create Agreement for reservation:', reservation.reservationNumber);
    
    if (navigateToView) {
      navigateToView('create-agreement', {
        reservationNumber: reservation.reservationNumber,
        reservationData: reservation
      });
    }
  };

  // Handle edit reservation
  const handleEditReservation = (reservation) => {
    console.log('✏️ Editing reservation:', reservation.reservationNumber);
    
    if (navigateToView) {
      navigateToView('create-reservation', {
        editMode: true,
        reservationData: reservation
      });
    }
  };

  // Get current data based on view
  const getCurrentData = () => {
    return currentView === 'history' ? reservations : comparisons;
  };

  // Get current view key for column management
  const getCurrentViewKey = () => {
    return currentView === 'history' ? 'reservation-history' : 'reservation-comparison';
  };

  // Get arrival status
  const getArrivalStatus = (reserved, arrived) => {
    if (!arrived || arrived === 0) return 'PENDING';
    if (arrived >= reserved) return 'FULL';
    return 'PARTIAL';
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'FULL': return '#28a745';
      case 'PARTIAL': return '#ffc107';
      case 'PENDING': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // Initial load
  useEffect(() => {
    if (currentView === 'history') {
      fetchHistory(1, true);
    } else {
      fetchComparison(1, true);
    }
  }, [currentView]);

  return (
    <div className="reservation-module">
      {/* Header */}
      <div className="module-header">
        <div className="header-content">
          <h1>Reservation Management</h1>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ✗ {error}
        </div>
      )}

      {/* View Tabs */}
      <div className="view-tabs">
        <button 
          className={`tab ${currentView === 'history' ? 'active' : ''}`}
          onClick={() => handleViewChange('history')}
        >
          📋 History
        </button>
        <button 
          className={`tab ${currentView === 'comparison' ? 'active' : ''}`}
          onClick={() => handleViewChange('comparison')}
        >
          📊 Comparison (Agr vs Res)
        </button>
      </div>

      {/* Filters */}
      <div className="filter-section">
        <div className="filter-grid">
          <div className="filter-group">
            <label>Reservation Number</label>
            <input
              type="text"
              name="reservationNumber"
              value={filters.reservationNumber}
              onChange={handleFilterChange}
              placeholder={placeholders.reservationNumber}
            />
          </div>
          <div className="filter-group">
            <label>From Reservation Number</label>
            <input
              type="text"
              name="reservationNumberFrom"
              value={filters.reservationNumberFrom}
              onChange={handleFilterChange}
              placeholder="From (e.g., 1)"
            />
          </div>
          <div className="filter-group">
            <label>To Reservation Number</label>
            <input
              type="text"
              name="reservationNumberTo"
              value={filters.reservationNumberTo}
              onChange={handleFilterChange}
              placeholder="To (e.g., 10)"
            />
          </div>
          <div className="filter-group">
            <label>Vendor Name</label>
            <input
              type="text"
              name="customerName"
              value={filters.customerName}
              onChange={handleFilterChange}
              placeholder={placeholders.customerName}
            />
          </div>
          <div className="filter-group">
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
          <div className="filter-group">
            <label>Village</label>
            <input
              type="text"
              name="village"
              value={filters.village}
              onChange={handleFilterChange}
              placeholder={placeholders.village}
            />
          </div>
          <div className="filter-group">
            <label>Date From</label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
            />
          </div>
          <div className="filter-group">
            <label>Date To</label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
            />
          </div>
        </div>
        <div className="filter-actions">
          <button className="btn-apply" onClick={handleApplyFilters}>
            Apply Filters
          </button>
          <button className="btn-reset" onClick={handleResetFilters}>
            Reset
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="summary-section">
        {currentView === 'history' ? (
          <>
            <div className="summary-card">
              <div className="summary-label">Total Reservations</div>
              <div className="summary-value">{summary.totalReservations}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Total Fee</div>
              <div className="summary-value">₹{summary.totalReservationFee?.toLocaleString()}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Total Quintal</div>
              <div className="summary-value">{summary.totalReservedQuintal}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Total Bags</div>
              <div className="summary-value">
                {currentView === 'comparison' ? summary.totalArrivedBags : summary.totalNumberOfBags}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="summary-card">
              <div className="summary-label">Total Reserved Quintals</div>
              <div className="summary-value">{summary.totalReservedQuintal || 0}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Total Arrived Quintals</div>
              <div className="summary-value">{summary.totalArrivedQuintal || 0}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Total Fee</div>
              <div className="summary-value">₹{(summary.totalAgreementFee || 0).toLocaleString()}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Total Arrived Bags</div>
              <div className="summary-value">{summary.totalArrivedBags || 0}</div>
            </div>
          </>
        )}
      </div>

      {/* Data Table with Column Management */}
      <DataTable
        data={getCurrentData()}
        viewKey={getCurrentViewKey()}
        userId={user?.id}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        customRenderers={customRenderers}
        className="reservation-table"
        maxHeight="600px"
      />
    </div>
  );
};

export default ReservationModule;