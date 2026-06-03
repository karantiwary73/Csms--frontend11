import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './ReservationOverview.css';
import { getAllUnits } from './unitUtils';
import { buildApiUrl, API_ENDPOINTS } from './api';
import { 
  getColumnDefinition, 
  getAvailableColumns, 
  ColumnManagerService 
} from './ColumnRegistry';

/**
 * Reservation Overview Component
 * 
 * Admin monitoring dashboard with:
 * - Unit-based card layout
 * - Summary statistics per unit
 * - Infinite scroll pagination (100 at a time)
 * - Shows: Reservation No, Vendor Name, Reserved Quintal, Reservation Fee
 * 
 * Requirements: 4.1-4.5
 */
const ReservationOverview = () => {
  const [unitData, setUnitData] = useState({});
  const [unitSummaries, setUnitSummaries] = useState({}); // Store per-unit summaries from backend
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const tableRefsMap = useRef({});

  // Column management state
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [tempVisibleColumns, setTempVisibleColumns] = useState([]);
  const [appliedColumns, setAppliedColumns] = useState([]);

  const viewKey = 'reservation-overview';
  const userId = localStorage.getItem('userId') || 'default-user'; // Get from localStorage or context

  // Initialize columns on mount
  useEffect(() => {
    const resolvedColumns = ColumnManagerService.resolveColumnVisibility(userId, viewKey);
    const availableColumnsForView = getAvailableColumns(viewKey);
    console.log('🔧 Initializing columns for', viewKey);
    console.log('📋 Available columns:', availableColumnsForView);
    console.log('🎯 Resolved columns:', resolvedColumns);
    setAppliedColumns(resolvedColumns);
    setTempVisibleColumns(resolvedColumns);
  }, [userId, viewKey]);

  // Get available columns for this view
  const availableColumns = getAvailableColumns(viewKey);

  // Column Manager Actions
  const handleColumnToggle = (columnKey) => {
    const column = getColumnDefinition(columnKey);
    if (column?.required) return;
    
    console.log('🔄 Toggling column:', columnKey, 'Current temp columns:', tempVisibleColumns);
    
    setTempVisibleColumns(prev => {
      const newColumns = prev.includes(columnKey)
        ? prev.filter(col => col !== columnKey)
        : [...prev, columnKey];
      
      console.log('🔄 New temp columns after toggle:', newColumns);
      return newColumns;
    });
  };

  const handleApply = () => {
    setAppliedColumns([...tempVisibleColumns]);
    setShowColumnManager(false);
  };

  const handleSaveAsDefault = () => {
    if (userId) {
      const success = ColumnManagerService.saveUserPreferences(userId, viewKey, tempVisibleColumns);
      if (success) {
        setAppliedColumns([...tempVisibleColumns]);
        setShowColumnManager(false);
      }
    }
  };

  const handleResetToSystemDefault = () => {
    if (userId) {
      ColumnManagerService.clearUserPreferences(userId, viewKey);
    }
    const systemDefaults = ColumnManagerService.resolveColumnVisibility(null, viewKey);
    setTempVisibleColumns(systemDefaults);
    setAppliedColumns(systemDefaults);
  };

  const handleCloseColumnManager = () => {
    setTempVisibleColumns([...appliedColumns]);
    setShowColumnManager(false);
  };

  // Render table header based on visible columns
  const renderTableHeader = () => {
    return (
      <tr>
        {appliedColumns.map(columnKey => {
          const column = getColumnDefinition(columnKey);
          return (
            <th key={columnKey}>
              {column?.label || columnKey}
            </th>
          );
        })}
      </tr>
    );
  };

  // Render table row based on visible columns
  const renderTableRow = (res, index) => {
    const cellData = {
      reservationNumber: res.reservationNumber || 'N/A',
      customerName: res.customerName || 'N/A',
      reservedQuintal: res.reservedQuintal || 0,
      reservationFee: `₹${(res.reservationFee || 0).toLocaleString()}`
    };

    return (
      <tr key={index}>
        {appliedColumns.map(columnKey => (
          <td key={columnKey}>
            {cellData[columnKey] || ''}
          </td>
        ))}
      </tr>
    );
  };

  // Fetch overview data with pagination
  const fetchOverview = useCallback(async (pageNum = 1, reset = false) => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      // Fetch reservations with pagination (100 per page)
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.RESERVATIONS_OVERVIEW)}?page=${pageNum}&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch overview');
      }

      const data = await response.json();

      // Group reservations by unitId
      let grouped = {};
      const allUnits = getAllUnits();
      
      if (reset) {
        // Initialize all units with empty data on first load
        allUnits.forEach(unit => {
          const unitIdStr = unit._id.toString();
          grouped[unitIdStr] = {
            unitName: unit.name,
            unitCode: unit.code,
            reservations: []
          };
        });
      } else {
        // Keep existing data when loading more
        grouped = { ...unitData };
        // Deep copy reservations arrays
        Object.keys(grouped).forEach(unitId => {
          grouped[unitId] = {
            ...grouped[unitId],
            reservations: [...grouped[unitId].reservations]
          };
        });
      }

      // Group reservations by unitId - only for display
      data.data.forEach(reservation => {
        const unitId = reservation.unitId?.toString();
        
        if (unitId && grouped[unitId]) {
          grouped[unitId].reservations.push(reservation);
        }
      });

      setUnitData(grouped);
      
      // Store per-unit summary from backend on first load only (don't recalculate)
      if (reset && data.summary) {
        setUnitSummaries(data.summary);
        console.log('📊 Per-unit summaries from backend (locked):', data.summary);
      }
      
      setHasMore(data.pagination.hasMore);
      setPage(pageNum);

      console.log('📊 Page:', pageNum, 'Loaded:', data.data.length, 'Has more:', data.pagination.hasMore);
    } catch (err) {
      console.error('❌ Error fetching overview:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [unitData]);

  // Handle infinite scroll - check all table containers with debouncing
  const handleScroll = useCallback(() => {
    // Check any of the table containers for scroll position
    Object.values(tableRefsMap.current).forEach(container => {
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      
      // Load more when user scrolls near the bottom (within 500px)
      if (scrollHeight - scrollTop <= clientHeight + 500 && hasMore && !loading) {
        console.log('📜 Loading more reservations...');
        fetchOverview(page + 1, false);
      }
    });
  }, [page, hasMore, loading, fetchOverview]);

  // Debounced scroll handler to prevent excessive re-renders
  const debouncedHandleScroll = useMemo(() => {
    let timeoutId;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100); // 100ms debounce
    };
  }, [handleScroll]);

  // Handle create agreement button click
  const handleCreateAgreement = (reservation) => {
    console.log('📋 Creating agreement for reservation:', reservation.reservationNumber);
    // TODO: Navigate to Create Agreement page with reservation data
    // For now, just show an alert
    alert(`Create Agreement for Reservation: ${reservation.reservationNumber}\n\nVendor: ${reservation.customerName}\nQuintal: ${reservation.reservedQuintal}\nFee: ₹${reservation.reservationFee}`);
  };

  // Initial load
  useEffect(() => {
    fetchOverview(1, true);
  }, []);

  // Add scroll listeners to all table containers with debouncing
  useEffect(() => {
    const containers = Object.values(tableRefsMap.current);
    containers.forEach(container => {
      if (container) {
        container.addEventListener('scroll', debouncedHandleScroll, { passive: true });
      }
    });

    return () => {
      containers.forEach(container => {
        if (container) {
          container.removeEventListener('scroll', debouncedHandleScroll);
        }
      });
    };
  }, [debouncedHandleScroll]);

  return (
    <div className="reservation-overview-container">
      <h1>Reservation Overview - Monitoring Dashboard</h1>

      {error && (
        <div className="error-message">
          ✗ {error}
        </div>
      )}

      {loading && page === 1 && (
        <div className="loading-message">
          Loading overview data...
        </div>
      )}

      {/* Unit-based sections with infinite scroll */}
      <div className="units-grid">
        {Object.entries(unitData).map(([unitId, unitInfo]) => (
          <div key={unitId} className="unit-section">
            <div className="unit-header">
              <h2>{unitInfo.unitName || `Unit ${unitId.substring(0, 8)}`}</h2>
            </div>

            {/* Summary Statistics - Show per-unit stats */}
            {unitSummaries[unitId] && (
              <div className="unit-summary">
                <div className="summary-item">
                  <div className="summary-label">Total Reservations</div>
                  <div className="summary-value">{unitSummaries[unitId].totalReservations}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Total Reserved Quintal</div>
                  <div className="summary-value">{unitSummaries[unitId].totalReservedQuintal}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Total Reservation Fee</div>
                  <div className="summary-value">₹{unitSummaries[unitId].totalReservationFee.toLocaleString()}</div>
                </div>
              </div>
            )}

            {/* Reservations Table - 4 columns, all data loaded with infinite scroll */}
            <div className="recent-reservations">
              <div className="table-header-controls">
                <h3>Reservations from {unitInfo.unitName || `Unit ${unitId.substring(0, 8)}`}</h3>
                <button 
                  className="column-manager-btn"
                  onClick={() => {
                    console.log('Column manager button clicked. Current state:', showColumnManager);
                    console.log('Available columns:', availableColumns);
                    console.log('Applied columns:', appliedColumns);
                    console.log('Temp visible columns:', tempVisibleColumns);
                    setShowColumnManager(!showColumnManager);
                  }}
                  title="Manage Columns"
                >
                  ⚙️ Columns ({appliedColumns.length}/{availableColumns.length})
                </button>
              </div>

              {/* Column Manager Panel */}
              {showColumnManager && (
                <div className="column-manager-panel" style={{ display: 'block', visibility: 'visible' }}>
                  <div className="column-manager-header">
                    <h4>Column Visibility</h4>
                    <button 
                      className="btn-close"
                      onClick={handleCloseColumnManager}
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="column-list">
                    {availableColumns.map(columnKey => {
                      const column = getColumnDefinition(columnKey);
                      if (!column) return null;
                      
                      const isVisible = tempVisibleColumns.includes(columnKey);
                      const isRequired = column.required;
                      
                      console.log('🔍 Rendering column:', columnKey, {
                        isVisible,
                        isRequired,
                        tempVisibleColumns
                      });
                      
                      return (
                        <div 
                          key={columnKey}
                          className={`column-item ${isVisible ? 'visible' : 'hidden'} ${isRequired ? 'required' : 'optional'}`}
                        >
                          <label className="column-checkbox">
                            <input
                              type="checkbox"
                              checked={isVisible}
                              disabled={isRequired}
                              onChange={(e) => {
                                console.log('✅ Checkbox clicked for:', columnKey, 'checked:', e.target.checked);
                                e.stopPropagation();
                                handleColumnToggle(columnKey);
                              }}
                            />
                            <span className="column-label">
                              {column.label}
                              {isRequired && (
                                <span className="required-indicator" title="Required column">
                                  🔒
                                </span>
                              )}
                            </span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="column-manager-actions">
                    <button className="btn-apply" onClick={handleApply}>
                      Apply
                    </button>
                    {userId && (
                      <button className="btn-save-default" onClick={handleSaveAsDefault}>
                        Save as Default
                      </button>
                    )}
                    <button className="btn-reset" onClick={handleResetToSystemDefault}>
                      Reset to Default
                    </button>
                  </div>
                </div>
              )}
              <div 
                className="table-scroll-container"
                ref={(el) => {
                  if (el) tableRefsMap.current[unitId] = el;
                }}
              >
                <table className="overview-table">
                  <thead>
                    {renderTableHeader()}
                  </thead>
                  <tbody>
                    {unitInfo.reservations.length === 0 ? (
                      <tr>
                        <td colSpan={appliedColumns.length} className="no-data">No reservations found</td>
                      </tr>
                    ) : (
                      unitInfo.reservations.map((res, index) => renderTableRow(res, index))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading indicator for infinite scroll */}
      {loading && page > 1 && (
        <div className="loading-indicator">
          Loading more reservations...
        </div>
      )}

      {!hasMore && Object.keys(unitData).length > 0 && (
        <div className="end-message">
          ✓ All reservations loaded
        </div>
      )}

      {Object.keys(unitData).length === 0 && !loading && (
        <div className="no-data-message">
          No reservation data available
        </div>
      )}
    </div>
  );
};

export default ReservationOverview;
