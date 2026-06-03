import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './AgreementOverview.css';
import { getAllUnits } from './unitUtils';
import { buildApiUrl, API_ENDPOINTS } from './api';
import { 
  getColumnDefinition, 
  getAvailableColumns, 
  ColumnManagerService 
} from './ColumnRegistry';

/**
 * Agreement Overview Component with Working Column Management
 */
const AgreementOverview = ({ user, token }) => {
  const [unitData, setUnitData] = useState({});
  const [unitSummaries, setUnitSummaries] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const tableRefsMap = useRef({});

  // Column management state
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [tempVisibleColumns, setTempVisibleColumns] = useState([]);
  const [appliedColumns, setAppliedColumns] = useState([]);

  const viewKey = 'agreement-overview';
  const userId = user?.id || 'default-user';

  // Initialize columns on mount
  useEffect(() => {
    const resolvedColumns = ColumnManagerService.resolveColumnVisibility(userId, viewKey);
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
  const renderTableRow = (agreement, index) => {
    const displayDate = agreement.agreementDate || agreement.createdAt || agreement.createdOn;
    const formattedDate = displayDate ? new Date(displayDate).toLocaleDateString() : 'N/A';
    
    // Use the flattened charge fields from backend
    const paldariTotal = agreement.handlingChargeTotal || 0;
    const paldariPaid = agreement.handlingChargePaid || 0;
    const paldariDues = agreement.handlingChargeDue || 0;
    
    const cellData = {
      agreementDate: formattedDate,
      lotNumber: agreement.lotNumber || 'N/A',
      weightInQuintal: agreement.weightInQuintal || 0,
      numberOfBags: agreement.numberOfBags || 0,
      paldariTotal: `₹${paldariTotal.toLocaleString()}`,
      paldariPaid: `₹${paldariPaid.toLocaleString()}`,
      paldariDues: `₹${paldariDues.toLocaleString()}`
    };

    return (
      <tr key={`${agreement.agreementId}-${index}`}>
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
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.AGREEMENTS_OVERVIEW)}?page=${pageNum}&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch agreement overview');
      }

      const data = await response.json();

      // Group agreements by unitId
      let grouped = {};
      const allUnits = getAllUnits();
      
      if (reset) {
        allUnits.forEach(unit => {
          const unitIdStr = unit._id.toString();
          grouped[unitIdStr] = {
            unitName: unit.name,
            unitCode: unit.code,
            agreements: []
          };
        });
      } else {
        grouped = { ...unitData };
        Object.keys(grouped).forEach(unitId => {
          grouped[unitId] = {
            ...grouped[unitId],
            agreements: [...grouped[unitId].agreements]
          };
        });
      }

      data.data.forEach(agreement => {
        const unitId = agreement.unitId?.toString();
        if (unitId && grouped[unitId]) {
          grouped[unitId].agreements.push(agreement);
        }
      });

      setUnitData(grouped);
      
      if (reset && data.summary) {
        setUnitSummaries(data.summary);
      }
      
      setHasMore(data.pagination.hasMore);
      setPage(pageNum);

    } catch (err) {
      console.error('❌ Error fetching agreement overview:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [unitData, token]);

  // Handle infinite scroll with debouncing
  const handleScroll = useCallback(() => {
    Object.values(tableRefsMap.current).forEach(container => {
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      
      if (scrollHeight - scrollTop <= clientHeight + 500 && hasMore && !loading) {
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

  // Initial load
  useEffect(() => {
    fetchOverview(1, true);
  }, []);

  // Add scroll listeners with debouncing
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
    <div className="agreement-overview-container">
      <h1>Agreement Overview</h1>

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
        {Object.entries(unitData).map(([unitId, unitInfo]) => {
          const summary = unitSummaries[unitId] || {
            totalAgreements: 0,
            totalBags: 0,
            totalQuintals: 0,
            totalPaldariCost: 0,
            totalPaldariPaid: 0,
            totalPaldariDues: 0
          };

          return (
            <div key={unitId} className="unit-section">
              <div className="unit-header">
                <h2>{unitInfo.unitName || `Unit ${unitId.substring(0, 8)}`}</h2>
              </div>

              {/* Summary Statistics */}
              <div className="unit-summary">
                <div className="summary-item">
                  <div className="summary-label">Total Number of Agreements</div>
                  <div className="summary-value">{summary.totalAgreements.toLocaleString()}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Total Paldari Amount</div>
                  <div className="summary-value">₹{summary.totalPaldariCost.toLocaleString()}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Total Paldari Paid</div>
                  <div className="summary-value">₹{summary.totalPaldariPaid.toLocaleString()}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Total Paldari Due</div>
                  <div className="summary-value">₹{summary.totalPaldariDues.toLocaleString()}</div>
                </div>
              </div>

              {/* Agreements Table */}
              <div className="recent-agreements">
                <div className="table-header-controls">
                  <h3>Recent Agreements from {unitInfo.unitName || `Unit ${unitId.substring(0, 8)}`}</h3>
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
                      {unitInfo.agreements.length === 0 ? (
                        <tr>
                          <td colSpan={appliedColumns.length} className="no-data">No agreements found</td>
                        </tr>
                      ) : (
                        unitInfo.agreements.map((agreement, index) => renderTableRow(agreement, index))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading indicator for infinite scroll */}
      {loading && page > 1 && (
        <div className="loading-indicator">
          Loading more agreements...
        </div>
      )}

      {!hasMore && Object.keys(unitData).length > 0 && (
        <div className="end-message">
          ✓ All agreements loaded
        </div>
      )}

      {Object.keys(unitData).length === 0 && !loading && (
        <div className="no-data-message">
          No agreement data available
        </div>
      )}
    </div>
  );
};

export default AgreementOverview;