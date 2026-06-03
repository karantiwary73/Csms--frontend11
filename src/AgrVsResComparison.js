import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './AgrVsResComparison.css';
import { buildApiUrl, API_ENDPOINTS } from './api';

/**
 * Agreement vs Reservation Comparison Component
 * 
 * Displays side-by-side comparison of reserved vs actual values with:
 * - Summary statistics
 * - Arrival status tracking
 * - Infinite scroll pagination
 * - Read-only mode
 * 
 * Requirements: 5.1-5.6, 11.1-11.5
 */
const AgrVsResComparison = () => {
  const [comparisons, setComparisons] = useState([]);
  const [summary, setSummary] = useState({
    totalReservedQuintal: 0,
    totalArrivedQuintal: 0,
    totalAgreementFee: 0,
    totalArrivedBags: 0
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
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        page: pageNum,
        limit: 100
      });

      console.log('🔍 Making API request to:', `/api/reservations/agr-vs-res?${queryParams}`);
      console.log('🔍 Using token:', token ? 'Present' : 'Missing');

      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.RESERVATIONS_AGR_VS_RES)}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('🔍 Response status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to fetch comparison data');
      }

      const data = await response.json();

      // Debug logging
      console.log('🔍 AgrVsRes API Response:', {
        success: data.success,
        dataLength: data.data?.length,
        firstRecord: data.data?.[0],
        summary: data.summary
      });

      // Log first few records in detail
      if (data.data && data.data.length > 0) {
        console.log('🔍 First 3 records detailed:');
        data.data.slice(0, 3).forEach((record, index) => {
          console.log(`Record ${index + 1}:`, {
            reservationNumber: record.reservationNumber,
            customerName: record.customerName,
            arrivedBags: record.arrivedBags,
            arrivedQuintal: record.arrivedQuintal,
            agreementCount: record.agreementCount,
            allFields: Object.keys(record)
          });
        });
      }

      if (reset) {
        console.log('🔍 Setting comparisons data (reset=true)');
        setComparisons(data.data);
        setSummary(data.summary || {});
      } else {
        console.log('🔍 Appending comparisons data (reset=false)');
        setComparisons(prev => [...prev, ...data.data]);
      }

      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error('❌ API Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate variance status and percentage
  const calculateVariance = (reserved, actual) => {
    if (!reserved || reserved === 0) return { status: 'N/A', percentage: 0 };
    
    const variance = Math.abs(reserved - actual);
    const percentage = ((variance / reserved) * 100).toFixed(1);
    
    if (variance === 0) return { status: 'Matched', percentage: 0 };
    if (percentage <= 10) return { status: 'Partial', percentage: parseFloat(percentage) };
    return { status: 'Mismatch', percentage: parseFloat(percentage) };
  };

  // Get arrival status color
  const getArrivalStatusColor = (status) => {
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

  // Handle infinite scroll with debouncing
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !loading) {
      fetchComparison(page + 1, false);
    }
  }, [hasMore, loading, page]);

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
    fetchComparison(1, true);
  }, [fetchComparison]);

  // Add scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', debouncedHandleScroll, { passive: true });
      return () => container.removeEventListener('scroll', debouncedHandleScroll);
    }
  }, [debouncedHandleScroll]);

  return (
    <div className="comparison-container">
      <div className="page-header">
        <h2>Agreement vs Reservation Comparison</h2>
        <p>Compare reserved quantities with actual arrivals</p>
        {/* Cache buster - remove after confirming fix */}
        <small style={{color: '#666', fontSize: '12px'}}>
          Component updated: {new Date().toLocaleString()} - v2.1
        </small>
      </div>

      {error && (
        <div className="error-message">
          ✗ {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="summary-section">
        <div className="summary-card">
          <div className="summary-label">Total Reserved Quintals</div>
          <div className="summary-value">{summary.totalReservedQuintal?.toLocaleString() || 0}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Arrived Quintals</div>
          <div className="summary-value">{summary.totalArrivedQuintal?.toLocaleString() || 0}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Fee</div>
          <div className="summary-value">₹{summary.totalAgreementFee?.toLocaleString() || 0}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Arrived Bags</div>
          <div className="summary-value">{summary.totalArrivedBags?.toLocaleString() || 0}</div>
        </div>
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{background: '#f0f0f0', padding: '10px', margin: '10px 0', fontSize: '12px'}}>
          <strong>Debug Info:</strong><br/>
          Comparisons length: {comparisons.length}<br/>
          Summary: {JSON.stringify(summary)}<br/>
          First comparison: {JSON.stringify(comparisons[0])}
        </div>
      )}

      {/* Comparison Table */}
      <div className="comparison-section">
        <div className="table-container" ref={scrollContainerRef}>
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Reservation No</th>
                <th>Customer Name</th>
                <th>Mobile</th>
                <th>District</th>
                <th>Reserved Quintal</th>
                <th>Arrived Quintal</th>
                <th>Status</th>
                <th className="bags-header">Number of Bags</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.length === 0 && !loading ? (
                <tr>
                  <td colSpan="8" className="no-data">No comparison data found</td>
                </tr>
              ) : (
                comparisons.map((comp, index) => (
                  <tr key={index}>
                    <td>{comp.reservationNumber || '--'}</td>
                    <td>{comp.customerName || '--'}</td>
                    <td>{comp.mobile || '--'}</td>
                    <td>{comp.district || '--'}</td>
                    <td>{comp.reservedQuintal || 0}</td>
                    <td>{comp.arrivedQuintal || 0}</td>
                    <td>
                      <span
                        className="arrival-status"
                        style={{ 
                          backgroundColor: getArrivalStatusColor(comp.arrivalStatus),
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      >
                        {comp.arrivalStatus || 'PENDING'}
                      </span>
                    </td>
                    <td className="bags-column">
                      {comp.arrivedBags || 0}
                      {/* Debug info - remove after fixing */}
                      {process.env.NODE_ENV === 'development' && (
                        <small style={{display: 'block', color: '#666', fontSize: '10px'}}>
                          Debug: {JSON.stringify({arrivedBags: comp.arrivedBags, agreementCount: comp.agreementCount})}
                        </small>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {loading && (
            <div className="loading-indicator">
              Loading more comparisons...
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="legend-section">
        <h3>Arrival Status Legend</h3>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#28a745' }}></span>
            <span>FULL (Fully arrived)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#ffc107' }}></span>
            <span>PARTIAL (Partially arrived)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#dc3545' }}></span>
            <span>PENDING (Not arrived)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgrVsResComparison;