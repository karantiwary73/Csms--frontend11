import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import './DataTable.css';
import { 
  getColumnDefinition, 
  getAvailableColumns, 
  ColumnManagerService 
} from './ColumnRegistry';

/**
 * Enterprise-Grade Data Table Component with Centralized Column Management
 * 
 * Features:
 * - Centralized column definition registry
 * - System default columns per view
 * - User preference persistence
 * - Column Manager UI with checkbox controls
 * - Sticky columns and visual hierarchy
 * - No horizontal scrolling in default view
 * - Infinite scroll support
 */
const DataTable = ({
  data = [],
  viewKey = 'default',
  userId = null,
  loading = false,
  hasMore = false,
  onLoadMore = null,
  onRowAction = null,
  onActionClick = null,
  actionButtons = [],
  className = '',
  maxHeight = '600px',
  emptyMessage = 'No records found',
  customRenderers = {}
}) => {
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [tempVisibleColumns, setTempVisibleColumns] = useState([]);
  const [appliedColumns, setAppliedColumns] = useState([]);
  
  const scrollContainerRef = useRef(null);

  // Initialize columns on mount
  useEffect(() => {
    const resolvedColumns = ColumnManagerService.resolveColumnVisibility(userId, viewKey);
    setAppliedColumns(resolvedColumns);
    setTempVisibleColumns(resolvedColumns);
  }, [userId, viewKey]);

  // Get available columns for this view
  const availableColumns = getAvailableColumns(viewKey);

  // Handle infinite scroll with debouncing
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || !onLoadMore || !hasMore || loading) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, loading]);

  // Debounced scroll handler to prevent excessive re-renders
  const debouncedHandleScroll = useMemo(() => {
    let timeoutId;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100); // 100ms debounce
    };
  }, [handleScroll]);

  // Column Manager Actions
  const handleColumnToggle = (columnKey) => {
    const column = getColumnDefinition(columnKey);
    if (column?.required) return; // Cannot toggle required columns
    
    setTempVisibleColumns(prev => 
      prev.includes(columnKey)
        ? prev.filter(col => col !== columnKey)
        : [...prev, columnKey]
    );
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
        // Could show a success message here
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
    // Reset temp columns to applied columns when closing without applying
    setTempVisibleColumns([...appliedColumns]);
    setShowColumnManager(false);
  };

  // Render cell content based on column type and custom renderers
  const renderCellContent = (columnKey, item) => {
    const column = getColumnDefinition(columnKey);
    if (!column) {
      const value = item[columnKey];
      // Ensure we never render objects as React children
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return value || '--';
    }

    // Handle action column specially
    if (columnKey === 'action' && actionButtons.length > 0) {
      return (
        <div className="action-buttons">
          {actionButtons.map(button => (
            <button
              key={button.key}
              className={`action-button ${button.key}-button`}
              onClick={(e) => {
                console.log(`Action button clicked: ${button.key}`, e);
                e.preventDefault();
                e.stopPropagation();
                
                if (onActionClick && onActionClick[button.key]) {
                  console.log(`Calling action handler for: ${button.key}`);
                  onActionClick[button.key](item);
                } else {
                  console.warn(`No action handler found for: ${button.key}`);
                }
              }}
              title={button.title || button.label}
            >
              {button.icon && <span className="button-icon">{button.icon}</span>}
              {button.label && <span className="button-label">{button.label}</span>}
            </button>
          ))}
        </div>
      );
    }

    // Check for custom renderer first
    if (customRenderers[columnKey]) {
      return customRenderers[columnKey](item, columnKey);
    }

    const value = item[columnKey];
    
    // Ensure we never render objects as React children
    if (typeof value === 'object' && value !== null) {
      console.warn(`Object value found for column ${columnKey}:`, value);
      return JSON.stringify(value);
    }
    
    // Handle different data types
    switch (column.type) {
      case 'currency':
        const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
        return (
          <div className="cell-content">
            <div className="primary-text">₹{numValue.toLocaleString()}</div>
          </div>
        );
      
      case 'date':
        return value ? new Date(value).toLocaleDateString('en-IN') : '--';
      
      case 'datetime':
        return (
          <div className="cell-content">
            <div className="primary-text">
              {value ? new Date(value).toLocaleDateString('en-IN') : '--'}
            </div>
            {value && (
              <div className="secondary-text">
                {new Date(value).toLocaleTimeString('en-IN', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            )}
          </div>
        );

      case 'contact':
        return (
          <div className="cell-content">
            <div className="primary-text">{value || '--'}</div>
            {item[`${columnKey}Alt`] && (
              <div className="secondary-text">{item[`${columnKey}Alt`]}</div>
            )}
          </div>
        );

      case 'user':
        return (
          <div className="cell-content">
            <div className="primary-text">{value || '--'}</div>
            {item[`${columnKey}Email`] && (
              <div className="secondary-text">{item[`${columnKey}Email`]}</div>
            )}
          </div>
        );

      case 'number':
        const numberValue = typeof value === 'number' ? value : parseFloat(value) || 0;
        return numberValue.toLocaleString();

      case 'custom':
        // For custom types, fall back to basic rendering unless custom renderer provided
        return String(value || '--');

      default:
        return String(value || '--');
    }
  };

  // Add scroll listener with debouncing
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', debouncedHandleScroll, { passive: true });
      return () => container.removeEventListener('scroll', debouncedHandleScroll);
    }
  }, [debouncedHandleScroll]);

  return (
    <div className={`data-table-wrapper ${className}`}>
      {/* Table Header with Column Manager */}
      <div className="table-header">
        <div className="table-info">
          <span className="record-count">
            {data.length} record{data.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="table-actions">
          <button 
            className="btn-columns"
            onClick={() => setShowColumnManager(!showColumnManager)}
          >
            ⚙️ Columns ({appliedColumns.length}/{availableColumns.length})
          </button>
        </div>
      </div>

      {/* Column Manager Panel */}
      {showColumnManager && (
        <div className="column-manager-panel">
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
                      onChange={() => handleColumnToggle(columnKey)}
                    />
                    <span className="column-label">
                      {column.label}
                      {isRequired && (
                        <span className="required-indicator" title="Required column">
                          🔒
                        </span>
                      )}
                      {column.sticky !== 'none' && (
                        <span className="sticky-indicator" title={`Sticky ${column.sticky}`}>
                          📌
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
                Save as My Default
              </button>
            )}
            <button className="btn-reset" onClick={handleResetToSystemDefault}>
              Reset to System Default
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div 
        className="table-container"
        ref={scrollContainerRef}
        style={{ maxHeight }}
      >
        <table className="data-table">
          <thead>
            <tr>
              {appliedColumns.map(columnKey => {
                const column = getColumnDefinition(columnKey);
                if (!column) return null;
                
                return (
                  <th 
                    key={columnKey}
                    className={`column-${columnKey} ${column.sticky !== 'none' ? `sticky-${column.sticky}` : ''}`}
                    style={{ 
                      width: column.width,
                      minWidth: column.width
                    }}
                  >
                    <div className="column-header">
                      <span className="column-title">{column.label}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && !loading ? (
              <tr>
                <td colSpan={appliedColumns.length} className="no-data">
                  <div className="no-data-content">
                    <div className="no-data-icon">📄</div>
                    <div className="no-data-text">{emptyMessage}</div>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr 
                  key={item.id || index}
                  className={`data-row ${onRowAction ? 'clickable' : ''}`}
                  onClick={() => onRowAction && onRowAction(item, 'view')}
                >
                  {appliedColumns.map(columnKey => {
                    const column = getColumnDefinition(columnKey);
                    if (!column) return null;
                    
                    return (
                      <td 
                        key={columnKey}
                        className={`column-${columnKey} ${column.sticky !== 'none' ? `sticky-${column.sticky}` : ''}`}
                      >
                        {renderCellContent(columnKey, item)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {loading && (
          <div className="loading-indicator">
            <div className="loading-spinner"></div>
            <span>Loading more records...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataTable;