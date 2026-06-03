import { useState, useEffect, useRef } from 'react';
import './ExpenditureHistory.css';
import { buildApiUrl, API_ENDPOINTS } from './api';

const ExpenditureHistory = ({ token }) => {

  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    expenseType: ''
  });

  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const [expenditures, setExpenditures] = useState([]);
  const [summary, setSummary] = useState({
    totalVouchers: 0,
    totalAmount: 0
  });
  const [amountByType, setAmountByType] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    hasMore: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summaryLocked, setSummaryLocked] = useState(false);

  // Safe error setter to ensure error is always a string
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

  const fetchExpenditures = async (page = 1, resetSummary = false, forceEmpty = false) => {
    setLoading(true);
    setSafeError('');

    try {
      const queryParams = new URLSearchParams();
      
      const currentFilters = forceEmpty ? {} : filtersRef.current;
      
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value && value.trim()) {
          queryParams.append(key, value.trim());
        }
      });

      queryParams.append('page', page.toString());
      queryParams.append('limit', pagination.limit.toString());

      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.EXPENDITURES_HISTORY)}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch expenditures');
      }

      if (page === 1) {
        setExpenditures(result.data);
        if (resetSummary || !summaryLocked) {
          setSummary(result.summary);
          setAmountByType(result.amountByType);
          setSummaryLocked(true);
        }
      } else {
        setExpenditures(prev => [...prev, ...result.data]);
      }

      setPagination(result.pagination);

    } catch (err) {
      console.error('Fetch expenditures error:', err);
      setSafeError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenditures(1, true);
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
    fetchExpenditures(1, true);
  };

  const handleReset = () => {
    if (loading) return;
    
    const emptyFilters = {
      fromDate: '',
      toDate: '',
      expenseType: ''
    };
    
    setFilters(emptyFilters);
    filtersRef.current = emptyFilters;
    
    setExpenditures([]);
    setSummaryLocked(false);
    
    setPagination({
      page: 1,
      limit: 100,
      total: 0,
      hasMore: false
    });
    
    fetchExpenditures(1, true, true);
  };

  const loadMore = () => {
    if (pagination.hasMore && !loading) {
      fetchExpenditures(pagination.page + 1, false);
    }
  };

  return (
    <div className="expenditure-history">
      <div className="page-header">
        <h2>Expenditure History</h2>
        <p>Search, filter, and analyze recorded expenditure vouchers (filtered by unit)</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Search Section */}
      <div className="search-section">
        <h3>Search / Filter</h3>
        <div className="search-grid">
          <div className="form-group">
            <label>From Date</label>
            <input
              type="date"
              name="fromDate"
              value={filters.fromDate}
              onChange={handleFilterChange}
            />
          </div>

          <div className="form-group">
            <label>To Date</label>
            <input
              type="date"
              name="toDate"
              value={filters.toDate}
              onChange={handleFilterChange}
            />
          </div>

          <div className="form-group">
            <label>Expense Type</label>
            <input
              type="text"
              name="expenseType"
              value={filters.expenseType}
              onChange={handleFilterChange}
              placeholder="Enter expense type"
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
            <div className="summary-label">Total Number of Vouchers</div>
            <div className="summary-value">{summary.totalVouchers.toLocaleString()}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Amount</div>
            <div className="summary-value">₹{summary.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      {/* Amount by Expense Type */}
      {Object.keys(amountByType).length > 0 && (
        <div className="visualization-section">
          <h3>Amount by Expense Type</h3>
          <div className="expense-type-grid">
            {Object.entries(amountByType).map(([type, amount]) => (
              <div key={type} className="expense-type-card">
                <div className="expense-type-label">{type}</div>
                <div className="expense-type-amount">₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="results-section">
        <h3>Expenditure Records ({pagination.total} total)</h3>
        
        <div className="table-container">
          <table className="results-table">
            <thead>
              <tr>
                <th>Expense ID</th>
                <th>Date</th>
                <th>Expense Type</th>
                <th>Description</th>
                <th>Payment Mode</th>
                <th>Paid To</th>
                <th>Amount</th>
                <th>Approved By</th>
              </tr>
            </thead>
            <tbody>
              {expenditures.length === 0 && !loading ? (
                <tr>
                  <td colSpan="8" className="no-data">No expenditure records found</td>
                </tr>
              ) : (
                expenditures.map((exp, index) => (
                  <tr key={index}>
                    <td>{exp.expenseId}</td>
                    <td>{new Date(exp.expenseDate).toLocaleDateString('en-IN')}</td>
                    <td><span className="expense-badge">{exp.expenseType}</span></td>
                    <td>{exp.expenseDescription}</td>
                    <td>{exp.paymentMode}</td>
                    <td>{exp.paidTo}</td>
                    <td className="amount-cell">₹{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{exp.paymentApproval}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
    </div>
  );
};

export default ExpenditureHistory;
