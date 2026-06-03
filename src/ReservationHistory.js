import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './ReservationHistory.css';
import { getAvailableColumns, getColumnDefinition, ColumnManagerService } from './ColumnRegistry';
import { buildApiUrl, API_ENDPOINTS } from './api';

/**
 * Enhanced Reservation History Component with Agreement vs Reservation Comparison
 * 
 * UPDATED: 2026-02-09 - Added reservation number range search (From/To fields)
 * 
 * Features:
 * - Toggle between Reservation View and Comparison View
 * - Unified filters and data source
 * - Infinite scroll pagination
 * - Summary statistics
 * - Read-only comparison view accessible to all users
 * - Reservation number range search (NEW)
 * 
 * Requirements: 2.1-2.12, 3.1-3.7, 5.1-5.6, 8.1-8.5, 9.1-9.8, 11.1-11.5
 */
const ReservationHistory = ({ user, token, navigateToView }) => {
  // FORCE RELOAD - Version 4.0 - COMPLETE REBUILD OF EDIT BUTTON
  console.log('🔄 ReservationHistory v4.0 - EDIT BUTTON REBUILT - ' + new Date().toISOString());
  
  // View toggle state
  const [currentView, setCurrentView] = useState('reservations'); // 'reservations' or 'comparison'
  
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  
  // Memoized placeholder values to prevent recalculation during re-renders
  const placeholders = useMemo(() => ({
    reservationNumber: "Enter reservation number",
    customerName: "Enter vendor name",
    mobile: "Enter mobile number",
    district: "Enter district"
  }), []);

  const [filters, setFilters] = useState({
    reservationNumber: '',
    reservationNumberFrom: '',
    reservationNumberTo: '',
    customerName: '',
    mobile: '',
    district: '',
    dateFrom: '',
    dateTo: ''
  });

  // Debug: Log to verify component is loaded with range fields
  useEffect(() => {
    console.log('🔍 ReservationHistory loaded with range search fields');
    console.log('🔍 Edit button should be visible in Action column');
  }, []);
  
  // CRITICAL: Use ref to always have latest filter values
  const filtersRef = useRef(filters);
  
  // Keep ref in sync with state
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const [reservations, setReservations] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [summary, setSummary] = useState({
    totalReservations: 0,
    totalReservationFee: 0,
    totalReservedQuintal: 0,
    totalNumberOfBags: 0
  });

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const scrollContainerRef = useRef(null);

  // Fetch comparison data
  const fetchComparison = useCallback(async (pageNum = 1, reset = false) => {
    setLoading(true);
    setError('');

    try {
      // ALWAYS use filtersRef.current for latest values
      const currentFilters = filtersRef.current;
      
      // Only include filters that have values
      const activeFilters = {};
      if (currentFilters.reservationNumber) activeFilters.reservationNumber = currentFilters.reservationNumber;
      if (currentFilters.reservationNumberFrom) activeFilters.reservationNumberFrom = currentFilters.reservationNumberFrom;
      if (currentFilters.reservationNumberTo) activeFilters.reservationNumberTo = currentFilters.reservationNumberTo;
      if (currentFilters.customerName) activeFilters.customerName = currentFilters.customerName;
      if (currentFilters.mobile) activeFilters.mobile = currentFilters.mobile;
      if (currentFilters.district) activeFilters.district = currentFilters.district;
      if (currentFilters.dateFrom) activeFilters.dateFrom = currentFilters.dateFrom;
      if (currentFilters.dateTo) activeFilters.dateTo = currentFilters.dateTo;
      
      const queryParams = new URLSearchParams({
        page: pageNum,
        limit: 100,
        ...activeFilters
      });

      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.RESERVATIONS_AGR_VS_RES)}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch comparison data');
      }

      const data = await response.json();

      if (reset) {
        setComparisons(data.data);
        setSummary(data.summary || {
          totalReservations: data.data.length,
          totalReservationFee: 0,
          totalReservedQuintal: 0,
          totalNumberOfBags: 0,
          totalArrivedQuintal: data.summary?.totalArrivedQuintal || 0,
          totalAgreementFee: data.summary?.totalAgreementFee || 0,
          totalArrivedBags: data.summary?.totalArrivedBags || 0,
          totalWithAgreements: data.summary?.totalWithAgreements || 0,
          totalAgreements: data.summary?.totalAgreements || 0
        });
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
  }, [token]);

  const fetchHistory = useCallback(async (pageNum = 1, reset = false) => {
    setLoading(true);
    setError('');

    try {
      // ALWAYS use filtersRef.current for latest values
      const currentFilters = filtersRef.current;
      
      // Only include filters that have values
      const activeFilters = {};
      if (currentFilters.reservationNumber) activeFilters.reservationNumber = currentFilters.reservationNumber;
      if (currentFilters.reservationNumberFrom) activeFilters.reservationNumberFrom = currentFilters.reservationNumberFrom;
      if (currentFilters.reservationNumberTo) activeFilters.reservationNumberTo = currentFilters.reservationNumberTo;
      if (currentFilters.customerName) activeFilters.customerName = currentFilters.customerName;
      if (currentFilters.mobile) activeFilters.mobile = currentFilters.mobile;
      if (currentFilters.district) activeFilters.district = currentFilters.district;
      if (currentFilters.dateFrom) activeFilters.dateFrom = currentFilters.dateFrom;
      if (currentFilters.dateTo) activeFilters.dateTo = currentFilters.dateTo;
      
      const queryParams = new URLSearchParams({
        page: pageNum,
        limit: 100,
        ...activeFilters
      });

      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.RESERVATIONS_HISTORY)}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

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
  }, [token]);

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Apply filters
  const handleApplyFilters = () => {
    if (loading) return; // Prevent multiple clicks
    
    // filtersRef is already in sync via useEffect
    setPage(1);
    
    if (currentView === 'reservations') {
      fetchHistory(1, true);
    } else {
      fetchComparison(1, true);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    if (loading) return; // Prevent multiple clicks
    
    const resetFilters = {
      reservationNumber: '',
      reservationNumberFrom: '',
      reservationNumberTo: '',
      customerName: '',
      mobile: '',
      district: '',
      dateFrom: '',
      dateTo: ''
    };
    
    // Update both state and ref
    setFilters(resetFilters);
    filtersRef.current = resetFilters; // Immediate sync
    setPage(1);
    
    // Fetch will use filtersRef.current which is now empty
    if (currentView === 'reservations') {
      fetchHistory(1, true);
    } else {
      fetchComparison(1, true);
    }
  };

  // Handle view toggle
  const handleViewToggle = (view) => {
    if (view === currentView) return;
    
    setCurrentView(view);
    setPage(1);
    setSummaryLocked(false);
    
    if (view === 'reservations') {
      setReservations([]);
      fetchHistory(1, true);
    } else {
      setComparisons([]);
      fetchComparison(1, true);
    }
  };

  // Handle infinite scroll with debouncing
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !loading) {
      if (currentView === 'reservations') {
        fetchHistory(page + 1, false);
      } else {
        fetchComparison(page + 1, false);
      }
    }
  }, [currentView, hasMore, loading, page]);

  // Debounced scroll handler to prevent excessive re-renders
  const debouncedHandleScroll = useMemo(() => {
    let timeoutId;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100); // 100ms debounce
    };
  }, [handleScroll]);

  // Get variance status color for comparison view
  const getVarianceStatusColor = (status) => {
    switch (status) {
      case 'FULL':
        return '#28a745';
      case 'PARTIAL':
        return '#ffc107';
      case 'PENDING':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  // Calculate arrival status
  const getArrivalStatus = (reserved, arrived) => {
    if (!arrived || arrived === 0) return 'PENDING';
    if (arrived >= reserved) return 'FULL';
    return 'PARTIAL';
  };

  // Handle create agreement - Navigate to Create Agreement page with reservation data
  const handleCreateAgreement = (reservation) => {
    console.log('📋 Navigating to Create Agreement for reservation:', reservation.reservationNumber);
    
    // Navigate to Create Agreement page with reservation data pre-filled
    if (navigateToView) {
      navigateToView('create-agreement', {
        reservationNumber: reservation.reservationNumber,
        reservationData: reservation
      });
    } else {
      // Fallback if navigation is not available
      alert(`Navigate to Create Agreement for Reservation: ${reservation.reservationNumber}\n\nVendor: ${reservation.customerName}`);
    }
  };

  // Handle edit reservation
  const handleEditReservation = (reservation) => {
    console.log('✏️ Editing reservation:', reservation.reservationNumber);
    
    // Navigate to Create Reservation page with reservation data for editing
    if (navigateToView) {
      navigateToView('create-reservation', {
        editMode: true,
        reservationData: reservation
      });
    } else {
      alert(`Edit Reservation: ${reservation.reservationNumber}`);
    }
  };

  // Column management functions
  const initializeColumns = useCallback(() => {
    const viewKey = currentView === 'comparison' ? 'reservation-comparison' : 'reservation-history';
    const userId = user?.id || 'default';
    const columns = ColumnManagerService.resolveColumnVisibility(userId, viewKey);
    setVisibleColumns(columns);
  }, [currentView, user]);

  const handleColumnToggle = (columnKey) => {
    setVisibleColumns(prev => {
      if (prev.includes(columnKey)) {
        return prev.filter(col => col !== columnKey);
      } else {
        return [...prev, columnKey];
      }
    });
  };

  const handleSaveColumns = () => {
    const viewKey = currentView === 'comparison' ? 'reservation-comparison' : 'reservation-history';
    const userId = user?.id || 'default';
    ColumnManagerService.saveUserPreferences(userId, viewKey, visibleColumns);
    setShowColumnDialog(false);
  };

  const handleResetColumns = () => {
    const viewKey = currentView === 'comparison' ? 'reservation-comparison' : 'reservation-history';
    const userId = user?.id || 'default';
    ColumnManagerService.clearUserPreferences(userId, viewKey);
    initializeColumns();
    setShowColumnDialog(false);
  };

  const isColumnVisible = (columnKey) => {
    return visibleColumns.includes(columnKey);
  };

  // Initial load
  useEffect(() => {
    // filtersRef starts with empty filters from initial state
    if (currentView === 'reservations') {
      fetchHistory(1, true);
    } else {
      fetchComparison(1, true);
    }
  }, [currentView, fetchHistory, fetchComparison]);

  // Initialize columns when view changes
  useEffect(() => {
    initializeColumns();
  }, [initializeColumns]);

  // Add scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', debouncedHandleScroll, { passive: true });
      return () => container.removeEventListener('scroll', debouncedHandleScroll);
    }
  }, [debouncedHandleScroll]);

  return (
    <div className="reservation-history-container">
      <div className="page-header">
        <h1>Reservation Management</h1>
        <p>View reservations and compare with agreements</p>
      </div>

      {error && (
        <div className="error-message">
          ✗ {error}
        </div>
      )}

      {/* View Toggle */}
      <div className="view-toggle-section">
        <div className="toggle-buttons">
          <button 
            className={`toggle-button ${currentView === 'reservations' ? 'active' : ''}`}
            onClick={() => handleViewToggle('reservations')}
          >
            📋 Reservation View
          </button>
          <button 
            className={`toggle-button ${currentView === 'comparison' ? 'active' : ''}`}
            onClick={() => handleViewToggle('comparison')}
          >
            📊 Comparison View (Agr vs Res)
          </button>
          <button 
            className="toggle-button column-button"
            onClick={() => setShowColumnDialog(true)}
          >
            ⚙️ Columns
          </button>
        </div>
        <div className="view-description">
          {currentView === 'reservations' 
            ? 'View and manage reservation records with full details and actions'
            : 'Read-only comparison between reservations and actual agreements'
          }
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <h2>Search Filters <span style={{fontSize: '12px', color: '#28a745', fontWeight: 'normal'}}>(v2.0 - Range Search)</span></h2>
        <div className="filter-grid">
          <div className="filter-group">
            <label htmlFor="reservationNumber">Reservation Number</label>
            <input
              type="text"
              id="reservationNumber"
              name="reservationNumber"
              value={filters.reservationNumber}
              onChange={handleFilterChange}
              placeholder={placeholders.reservationNumber}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="reservationNumberFrom">From Reservation Number</label>
            <input
              type="text"
              id="reservationNumberFrom"
              name="reservationNumberFrom"
              value={filters.reservationNumberFrom}
              onChange={handleFilterChange}
              placeholder="From (e.g., 1)"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="reservationNumberTo">To Reservation Number</label>
            <input
              type="text"
              id="reservationNumberTo"
              name="reservationNumberTo"
              value={filters.reservationNumberTo}
              onChange={handleFilterChange}
              placeholder="To (e.g., 10)"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="customerName">Vendor/Farmer Name</label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              value={filters.customerName}
              onChange={handleFilterChange}
              placeholder={placeholders.customerName}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="mobile">Mobile Number</label>
            <input
              type="text"
              id="mobile"
              name="mobile"
              value={filters.mobile}
              onChange={handleFilterChange}
              placeholder={placeholders.mobile}
              maxLength="10"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="district">District</label>
            <input
              type="text"
              id="district"
              name="district"
              value={filters.district}
              onChange={handleFilterChange}
              placeholder={placeholders.district}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="dateFrom">Date From</label>
            <input
              type="date"
              id="dateFrom"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="dateTo">Date To</label>
            <input
              type="date"
              id="dateTo"
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
            Reset Filters
          </button>
        </div>
      </div>

      {/* Summary Section */}
      <div className="summary-section">
        <div className="summary-card">
          <div className="summary-label">Total Reservations</div>
          <div className="summary-value">{summary.totalReservations}</div>
        </div>
        {currentView === 'reservations' ? (
          <>
            <div className="summary-card">
              <div className="summary-label">Total Reservation Fee</div>
              <div className="summary-value">₹{summary.totalReservationFee.toLocaleString()}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Total Reserved Quintal</div>
              <div className="summary-value">{summary.totalReservedQuintal}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Total Number of Bags</div>
              <div className="summary-value">{summary.totalNumberOfBags}</div>
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

      {/* Results Section */}
      <div className="results-section">
        <h2>
          {currentView === 'reservations' ? 'Reservation Records' : 'Agreement vs Reservation Comparison'}
        </h2>
        
        {currentView === 'reservations' ? (
          /* Reservation View */
          <div className="table-container" ref={scrollContainerRef}>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reservation No</th>
                  <th>Vendor Name</th>
                  <th>Mobile</th>
                  <th>Expected Arrival</th>
                  <th>Alternate Mobile</th>
                  <th>Email</th>
                  <th>Village</th>
                  <th>Post Office</th>
                  <th>District</th>
                  <th>Reserved Quintal</th>
                  <th>Number of Bags</th>
                  <th>Reservation Fee</th>
                  <th>Created By</th>
                  <th>Action [V4.0 - EDIT ADDED]</th>
                </tr>
              </thead>
              <tbody>
                {reservations.length === 0 && !loading ? (
                  <tr>
                    <td colSpan="15" className="no-data">No records found</td>
                  </tr>
                ) : (
                  reservations.map((res, index) => {
                    // DEBUG: Log each row render
                    if (index === 0) console.log('🔵 RENDERING FIRST ROW - EDIT BUTTON SHOULD BE VISIBLE');
                    return (
                    <tr key={index}>
                      <td>
                        <div>{new Date(res.date).toLocaleDateString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit' })}</div>
                        <div style={{ fontSize: '0.85em', color: '#666' }}>{new Date(res.createdOn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td>{res.reservationNumber}</td>
                      <td>{res.customerName}</td>
                      <td>{res.mobile}</td>
                      <td>
                        {res.expectedArrivalDate ? new Date(res.expectedArrivalDate).toLocaleDateString('en-IN') : '--'}
                      </td>
                      <td>{res.altMobile || '-'}</td>
                      <td>{res.email}</td>
                      <td>{res.addressLine1}</td>
                      <td>{res.addressLine2}</td>
                      <td>{res.district}</td>
                      <td>{res.reservedQuintal}</td>
                      <td>{res.numberOfBags}</td>
                      <td>₹{res.reservationFee.toLocaleString()}</td>
                      <td>{res.createdBy}</td>
                      <td>
                        {/* ACTION BUTTONS - REBUILT VERSION 4.0 */}
                        <div className="action-buttons" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          {/* EDIT BUTTON */}
                          <button 
                            type="button"
                            className="btn-edit-reservation"
                            onClick={() => {
                              console.log('🔵 EDIT CLICKED:', res.reservationNumber);
                              handleEditReservation(res);
                            }}
                            title="Edit this reservation"
                            style={{ 
                              padding: '6px 12px',
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: '2px solid #007bff',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                          >
                            EDIT
                          </button>
                          {/* CREATE AGREEMENT BUTTON */}
                          <button 
                            type="button"
                            className="btn-create-agreement"
                            onClick={() => handleCreateAgreement(res)}
                            title="Create Agreement for this reservation"
                          >
                            Create Agreement
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {loading && (
              <div className="loading-indicator">
                Loading more records...
              </div>
            )}
          </div>
        ) : (
          /* Comparison View */
          <div className="table-container comparison-view" ref={scrollContainerRef}>
            <table className="comparison-table">
              <thead>
                <tr>
                  {isColumnVisible('reservationNumber') && <th rowSpan="2" className="sticky-column">Reservation ID</th>}
                  <th colSpan={[
                    isColumnVisible('customerName'),
                    isColumnVisible('fatherName'),
                    isColumnVisible('mobile'),
                    isColumnVisible('addressLine1'),
                    isColumnVisible('district')
                  ].filter(Boolean).length} className="group-header vendor-group">Vendor Information</th>
                  <th colSpan={[
                    isColumnVisible('reservedQuintal'),
                    isColumnVisible('expectedArrivalDate')
                  ].filter(Boolean).length} className="group-header reservation-group">Reservation Data</th>
                  <th colSpan={[
                    isColumnVisible('arrivedQuintal'),
                    true // difference column (always show if arrived is shown)
                  ].filter(Boolean).length} className="group-header arrival-group">Arrival Data</th>
                  <th colSpan={[
                    isColumnVisible('reservationFee'),
                    isColumnVisible('status')
                  ].filter(Boolean).length} className="group-header financial-group">Financial</th>
                </tr>
                <tr>
                  {isColumnVisible('customerName') && <th className="vendor-group">Vendor Name</th>}
                  {isColumnVisible('fatherName') && <th className="vendor-group">Father's Name</th>}
                  {isColumnVisible('mobile') && <th className="vendor-group">Mobile</th>}
                  {isColumnVisible('addressLine1') && <th className="vendor-group">Address</th>}
                  {isColumnVisible('district') && <th className="vendor-group">District</th>}
                  {isColumnVisible('reservedQuintal') && <th className="reservation-group">Reserved Quintal</th>}
                  {isColumnVisible('expectedArrivalDate') && <th className="reservation-group">Expected Arrival</th>}
                  {isColumnVisible('arrivedQuintal') && <th className="arrival-group">Arrived Quintal</th>}
                  {isColumnVisible('arrivedQuintal') && <th className="arrival-group">Difference</th>}
                  {isColumnVisible('reservationFee') && <th className="financial-group">Fee</th>}
                  {isColumnVisible('status') && <th className="financial-group">Status</th>}
                </tr>
              </thead>
              <tbody>
                {comparisons.length === 0 && !loading ? (
                  <tr>
                    <td colSpan="12" className="no-data">No comparison data found</td>
                  </tr>
                ) : (
                  comparisons.map((comp, index) => {
                    const arrivalStatus = getArrivalStatus(comp.reservedQuintal, comp.arrivedQuintal);
                    const difference = (comp.arrivedQuintal || 0) - comp.reservedQuintal;
                    
                    return (
                      <tr key={index}>
                        {isColumnVisible('reservationNumber') && <td className="sticky-column reservation-id">{comp.reservationNumber}</td>}
                        {isColumnVisible('customerName') && <td className="vendor-group">{comp.customerName}</td>}
                        {isColumnVisible('fatherName') && <td className="vendor-group">{comp.fatherName || '--'}</td>}
                        {isColumnVisible('mobile') && <td className="vendor-group">{comp.mobile}</td>}
                        {isColumnVisible('addressLine1') && <td className="vendor-group">{comp.addressLine1}</td>}
                        {isColumnVisible('district') && <td className="vendor-group">{comp.district}</td>}
                        {isColumnVisible('reservedQuintal') && <td className="reservation-group">{comp.reservedQuintal}</td>}
                        {isColumnVisible('expectedArrivalDate') && (
                          <td className="reservation-group">
                            {comp.expectedArrivalDate ? new Date(comp.expectedArrivalDate).toLocaleDateString('en-IN') : '--'}
                          </td>
                        )}
                        {isColumnVisible('arrivedQuintal') && (
                          <td className="arrival-group">
                            <div className="arrival-data">
                              <span className="quintal-value">{comp.arrivedQuintal || 0}</span>
                              <span className="bags-value">({Math.round((comp.arrivedQuintal || 0) * 2)} bags)</span>
                              {comp.agreementCount > 0 ? (
                                <span className="agreement-count">({comp.agreementCount} agr)</span>
                              ) : (
                                <span className="no-agreements">No agreements</span>
                              )}
                            </div>
                          </td>
                        )}
                        {isColumnVisible('arrivedQuintal') && (
                          <td className={`arrival-group difference ${difference > 0 ? 'positive' : difference < 0 ? 'negative' : 'neutral'}`}>
                            {difference > 0 ? '+' : ''}{difference}
                          </td>
                        )}
                        {isColumnVisible('reservationFee') && <td className="financial-group">₹{comp.reservationFee.toLocaleString()}</td>}
                        {isColumnVisible('status') && (
                          <td className="financial-group">
                            <span
                              className="status-badge"
                              style={{ backgroundColor: getVarianceStatusColor(arrivalStatus) }}
                            >
                              {arrivalStatus}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {loading && (
              <div className="loading-indicator">
                Loading more comparisons...
              </div>
            )}
            
            {/* Legend for Comparison View */}
            {currentView === 'comparison' && (
              <div className="comparison-legend">
                <h4>Comparison View Information</h4>
                <div className="legend-items">
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#28a745' }}></span>
                    <span>FULL - Arrived quantity meets or exceeds reserved</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#ffc107' }}></span>
                    <span>PARTIAL - Some quantity arrived but less than reserved</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#dc3545' }}></span>
                    <span>PENDING - No arrival recorded yet</span>
                  </div>
                </div>
                <div className="info-note">
                  <strong>Note:</strong> Arrived quintal is calculated by summing the weight from all agreements created for each reservation. 
                  If no agreements exist for a reservation, the arrived quintal will show as 0.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Column Visibility Dialog */}
      {showColumnDialog && (
        <div className="column-dialog-overlay">
          <div className="column-dialog">
            <div className="column-dialog-header">
              <h3>Column Visibility</h3>
              <button 
                className="close-button"
                onClick={() => setShowColumnDialog(false)}
              >
                ×
              </button>
            </div>
            <div className="column-dialog-content">
              <div className="column-grid">
                {getAvailableColumns(currentView === 'comparison' ? 'reservation-comparison' : 'reservation-history').map(columnKey => {
                  const column = getColumnDefinition(columnKey);
                  if (!column) return null;
                  
                  return (
                    <div key={columnKey} className="column-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={isColumnVisible(columnKey)}
                          onChange={() => handleColumnToggle(columnKey)}
                        />
                        <span className="column-label">{column.label}</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="column-dialog-actions">
              <button className="btn-apply" onClick={handleSaveColumns}>
                Apply
              </button>
              <button className="btn-reset" onClick={handleResetColumns}>
                Reset to System Default
              </button>
              <button className="btn-cancel" onClick={() => setShowColumnDialog(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationHistory;