import React, { useState, useEffect, useMemo } from 'react';
import './RebateHistory.css';
import { buildApiUrl, API_ENDPOINTS } from './api';

const RebateHistory = ({ user, token }) => {
  const [rebates, setRebates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Memoized placeholder values to prevent recalculation during re-renders
  const placeholders = useMemo(() => ({
    agreementNumber: "Enter agreement number"
  }), []);

  // Filter state
  const [filters, setFilters] = useState({
    agreementNumber: '',
    dateFrom: '',
    dateTo: ''
  });
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false
  });
  
  // Summary state
  const [summary, setSummary] = useState({
    totalRebatesIssued: 0,
    totalRebateAmount: 0
  });

  // Load rebates on component mount and when filters change
  useEffect(() => {
    loadRebates();
  }, [filters, pagination.page]);

  const loadRebates = async (customFilters = null) => {
    setLoading(true);
    setError('');

    try {
      // Use custom filters if provided, otherwise use state filters
      const filtersToUse = customFilters !== null ? customFilters : filters;
      
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filtersToUse
      });

      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.REBATES)}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load rebates');
      }

      setRebates(result.data);
      setPagination(prev => ({
        ...prev,
        total: result.pagination.total,
        hasMore: result.pagination.hasMore
      }));
      setSummary(result.summary);

    } catch (err) {
      console.error('Load rebates error:', err);
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
    
    // Reset to first page when filters change
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  };

  const handleSearch = () => {
    if (loading) return; // Prevent multiple clicks
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
    loadRebates();
  };

  const handleClearFilters = () => {
    if (loading) return; // Prevent multiple clicks
    
    setFilters({
      agreementNumber: '',
      dateFrom: '',
      dateTo: ''
    });
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
    // Don't call loadRebates() - useEffect will handle it automatically
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleCancelRebate = async (rebateId) => {
    const reason = prompt('Please enter the reason for cancelling this rebate:');
    if (!reason) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.REBATES)}/${rebateId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cancellationReason: reason
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel rebate');
      }

      setSuccess('Rebate cancelled successfully');
      loadRebates(); // Reload the list
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Cancel rebate error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rebate-history">
      <div className="page-header">
        <h2>📊 Rebate History</h2>
        <p>View and manage all issued rebates</p>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <h3>Search & Filter</h3>
        <div className="filters-form">
          <div className="filter-row">
            <div className="form-group">
              <label>Agreement Number</label>
              <input
                type="text"
                name="agreementNumber"
                value={filters.agreementNumber}
                onChange={handleFilterChange}
                placeholder={placeholders.agreementNumber}
              />
            </div>
            <div className="form-group">
              <label>Date From</label>
              <input
                type="date"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
              />
            </div>
            <div className="form-group">
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
            <button onClick={handleSearch} className="btn-search" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button onClick={handleClearFilters} className="btn-clear">
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Summary Section */}
      <div className="summary-section">
        <div className="summary-card">
          <div className="summary-item">
            <label>Total Rebates Issued:</label>
            <span className="summary-value">{summary.totalRebatesIssued}</span>
          </div>
          <div className="summary-item">
            <label>Total Rebate Amount:</label>
            <span className="summary-value">₹{summary.totalRebateAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Rebates Table */}
      <div className="rebates-section">
        <h3>Rebate Records</h3>
        
        {rebates.length > 0 ? (
          <>
            <div className="table-container">
              <table className="rebates-table">
                <thead>
                  <tr>
                    <th>Agreement Number</th>
                    <th>Lot Number</th>
                    <th>Vendor Name</th>
                    <th>Weight (Quintals)</th>
                    <th>Bags</th>
                    <th>Original Amount</th>
                    <th>Rebate Amount</th>
                    <th>Net Payable</th>
                    <th>Rebate Type</th>
                    <th>Issued By</th>
                    <th>Issued On</th>
                    {user?.role === 'ADMIN' && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rebates.map((rebate) => (
                    <tr key={rebate._id}>
                      <td>{rebate.agreementNumber}</td>
                      <td>{rebate.agreementId?.lotNumber || '-'}</td>
                      <td>{rebate.agreementId?.reservationId?.customerId?.customerName || '-'}</td>
                      <td>{rebate.agreementId?.weightInQuintal || '-'}</td>
                      <td>{rebate.agreementId?.numberOfBags || '-'}</td>
                      <td>₹{rebate.originalPayableAmount.toLocaleString('en-IN')}</td>
                      <td className="rebate-amount">-₹{rebate.rebateAmount.toLocaleString('en-IN')}</td>
                      <td className="net-payable">₹{rebate.netPayableAfterRebate.toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`rebate-type ${rebate.rebateType}`}>
                          {rebate.rebateType === 'amount' ? 'Fixed Amount' : 'Per Quintal'}
                        </span>
                      </td>
                      <td>{rebate.issuedByName || rebate.issuedBy || '-'}</td>
                      <td>
                        {new Date(rebate.issuedOn).toLocaleDateString()} {new Date(rebate.issuedOn).toLocaleTimeString()}
                      </td>
                      {user?.role === 'ADMIN' && (
                        <td>
                          {rebate.status === 'active' && (
                            <button
                              onClick={() => handleCancelRebate(rebate._id)}
                              className="btn-cancel"
                              disabled={loading}
                            >
                              Cancel
                            </button>
                          )}
                          {rebate.status === 'cancelled' && (
                            <span className="cancelled-info">
                              Cancelled by {rebate.cancelledByName || rebate.cancelledBy}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination">
              <div className="pagination-info">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} rebates
              </div>
              <div className="pagination-controls">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1 || loading}
                  className="btn-page"
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {pagination.page}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasMore || loading}
                  className="btn-page"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="no-data-message">
            {loading ? (
              <p>Loading rebates...</p>
            ) : (
              <p>No rebates found. {filters.agreementNumber || filters.dateFrom || filters.dateTo ? 'Try adjusting your search criteria.' : 'No rebates have been issued yet.'}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RebateHistory;