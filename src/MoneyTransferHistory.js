import { useState, useEffect, useRef } from 'react';
import './MoneyTransferHistory.css';
import { buildApiUrl, API_ENDPOINTS } from './api';

const MoneyTransferHistory = ({ token }) => {
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    type: 'ALL'
  });

  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const [transfers, setTransfers] = useState([]);
  const [summary, setSummary] = useState({
    totalCredit: 0,
    totalDebit: 0,
    surplus: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    hasMore: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summaryLocked, setSummaryLocked] = useState(false);

  // Safe error setter
  const setSafeError = (err) => {
    if (typeof err === 'string') {
      setError(err);
    } else if (err && typeof err === 'object') {
      if (err.message) {
        setError(err.message);
      } else if (err.error) {
        setError(typeof err.error === 'string' ? err.error : 'An error occurred');
      } else {
        setError('An error occurred');
      }
    } else {
      setError('An error occurred');
    }
  };

  const fetchTransfers = async (page = 1, resetSummary = false, forceEmpty = false) => {
    setLoading(true);
    setSafeError('');

    try {
      const queryParams = new URLSearchParams();
      
      const currentFilters = forceEmpty ? {} : filtersRef.current;
      
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value && value.trim() && value !== 'ALL') {
          queryParams.append(key, value.trim());
        }
      });

      queryParams.append('page', page.toString());
      queryParams.append('limit', pagination.limit.toString());

      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.MONEY_TRANSFERS_HISTORY)}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch money transfers');
      }

      if (page === 1) {
        setTransfers(result.data);
        if (resetSummary || !summaryLocked) {
          setSummary(result.summary);
          setSummaryLocked(true);
        }
      } else {
        setTransfers(prev => [...prev, ...result.data]);
      }

      setPagination(result.pagination);

    } catch (err) {
      console.error('Fetch money transfers error:', err);
      setSafeError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = () => {
    if (loading) return;
    setSummaryLocked(false);
    fetchTransfers(1, true);
  };

  const handleReset = () => {
    if (loading) return;
    
    const emptyFilters = {
      fromDate: '',
      toDate: '',
      type: 'ALL'
    };
    
    setFilters(emptyFilters);
    filtersRef.current = emptyFilters;
    
    setTransfers([]);
    setSummaryLocked(false);
    
    setPagination({
      page: 1,
      limit: 100,
      total: 0,
      hasMore: false
    });
    
    fetchTransfers(1, true, true);
  };

  const loadMore = () => {
    if (pagination.hasMore && !loading) {
      fetchTransfers(pagination.page + 1, false);
    }
  };

  return (
    <div className="money-transfer-history">
      <div className="page-header">
        <h2>Money Transfer History</h2>
        <p>Complete audit log of all internal money transfers</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Search Section */}
      <div className="money-transfer-history-search-section">
        <h3>Search / Filter</h3>
        <div className="money-transfer-history-search-grid">
          <div className="money-transfer-history-form-group">
            <label>From Date</label>
            <input
              type="date"
              name="fromDate"
              value={filters.fromDate}
              onChange={handleFilterChange}
            />
          </div>

          <div className="money-transfer-history-form-group">
            <label>To Date</label>
            <input
              type="date"
              name="toDate"
              value={filters.toDate}
              onChange={handleFilterChange}
            />
          </div>

          <div className="money-transfer-history-form-group">
            <label>Transfer Type</label>
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
            >
              <option value="ALL">All Types</option>
              <option value="INWARD">INWARD (Credit)</option>
              <option value="OUTWARD">OUTWARD (Debit)</option>
            </select>
          </div>
        </div>

        <div className="money-transfer-history-search-actions">
          <button onClick={handleSearch} disabled={loading} className="money-transfer-history-search-button">
            {loading ? 'Searching...' : 'Filter'}
          </button>
          <button onClick={handleReset} disabled={loading} className="money-transfer-history-reset-button">
            Reset
          </button>
        </div>
      </div>

      {/* Summary Section */}
      <div className="money-transfer-history-summary-section">
        <h3>Summary Indicators</h3>
        <div className="money-transfer-history-summary-grid">
          <div className="money-transfer-history-summary-card credit">
            <div className="money-transfer-history-summary-label">CR (Credit)</div>
            <div className="money-transfer-history-summary-value">₹{summary.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="money-transfer-history-summary-desc">Money received</div>
          </div>
          <div className="money-transfer-history-summary-card debit">
            <div className="money-transfer-history-summary-label">DR (Debit)</div>
            <div className="money-transfer-history-summary-value">₹{summary.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="money-transfer-history-summary-desc">Money paid out</div>
          </div>
          <div className={`money-transfer-history-summary-card surplus ${summary.surplus >= 0 ? 'positive' : 'negative'}`}>
            <div className="money-transfer-history-summary-label">Surplus</div>
            <div className="money-transfer-history-summary-value">₹{summary.surplus.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="money-transfer-history-summary-desc">{summary.surplus >= 0 ? 'Net inflow' : 'Net outflow'}</div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="money-transfer-history-results-section">
        <h3>Transfer History ({pagination.total} total)</h3>
        
        <div className="money-transfer-history-table-container">
          <table className="money-transfer-history-results-table">
            <thead>
              <tr>
                <th>Transfer Date</th>
                <th>Entry By</th>
                <th>Transferred Via</th>
                <th>Receiver</th>
                <th>Transaction Type</th>
                <th>Amount</th>
                <th>Reference Number</th>
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 && !loading ? (
                <tr>
                  <td colSpan="7" className="money-transfer-history-no-data">No money transfer records found</td>
                </tr>
              ) : (
                transfers.map((transfer, index) => (
                  <tr key={index}>
                    <td>{new Date(transfer.date).toLocaleDateString('en-IN')}</td>
                    <td>{transfer.createdBy}</td>
                    <td>{transfer.mode}</td>
                    <td>{transfer.onRequestOf}</td>
                    <td>
                      <span className={`money-transfer-history-type-badge ${transfer.type.toLowerCase()}`}>
                        {transfer.type === 'INWARD' ? 'CR (Credit)' : 'DR (Debit)'}
                      </span>
                    </td>
                    <td className="money-transfer-history-amount-cell">₹{transfer.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{transfer.referenceNumber || '--'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.hasMore && (
          <div className="money-transfer-history-load-more-section">
            <button 
              onClick={loadMore} 
              disabled={loading}
              className="money-transfer-history-load-more-button"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoneyTransferHistory;
