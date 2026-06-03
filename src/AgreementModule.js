import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './AgreementModule.css';
import DataTable from './DataTable';
import PrintAgreementLetter from './PrintAgreementLetter';
import { buildApiUrl, API_ENDPOINTS } from './api';

/**
 * Unified Enterprise-Grade Agreement Module
 * 
 * Features:
 * - Centralized column management with system defaults
 * - User preferences per view with persistence
 * - Sticky columns and visual hierarchy
 * - Infinite scroll support
 * - Consistent layout
 */
const AgreementModule = ({ user, token, navigateToView }) => {
  // Data state
  const [agreements, setAgreements] = useState([]);
  const [summary, setSummary] = useState({
    totalAgreements: 0,
    totalWeightInQuintal: 0,
    totalNumberOfBags: 0,
    totalAmount: 0,
    totalPaldariCost: 0,
    totalPaldariPaid: 0,
    totalPaldariDues: 0
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedAgreementForPrint, setSelectedAgreementForPrint] = useState(null);

  // Memoized placeholder values to prevent recalculation during re-renders
  const placeholders = useMemo(() => ({
    agreementNumber: "Enter agreement number",
    customerName: "Enter vendor name", 
    mobile: "Enter mobile",
    village: "Enter village"
  }), []);

  // Filter state
  const [filters, setFilters] = useState({
    agreementNumber: '',
    customerName: '',
    mobile: '',
    village: '',
    dateFrom: '',
    dateTo: ''
  });

  // Custom renderers for specific columns
  const customRenderers = {
    agreementNumber: (item) => (
      <div className="cell-content">
        <div className="primary-text">{item.agreementId || item.agreementNumber}</div>
        {item.agreementDate && (
          <div className="secondary-text">
            {new Date(item.agreementDate).toLocaleDateString('en-IN')}
          </div>
        )}
      </div>
    ),
    
    paldariDues: (item) => {
      const paldariDue = item.charges?.handlingChargeDue || 0;
      return (
        <div className="cell-content">
          <div className="primary-text">₹{paldariDue.toLocaleString()}</div>
        </div>
      );
    },
    
    paldariTotal: (item) => {
      const paldariTotal = item.charges?.handlingChargeTotal || 0;
      return (
        <div className="cell-content">
          <div className="primary-text">₹{paldariTotal.toLocaleString()}</div>
        </div>
      );
    },
    
    paldariPaid: (item) => {
      const paldariPaid = item.charges?.handlingChargePaid || 0;
      return (
        <div className="cell-content">
          <div className="primary-text">₹{paldariPaid.toLocaleString()}</div>
        </div>
      );
    },
    
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
    
    totalAmount: (item) => {
      // Calculate net amount due (total charges - total paid)
      const totalCharges = (item.charges?.handlingChargeTotal || 0) + 
                          (item.charges?.bagChargeTotal || 0) + 
                          (item.charges?.totalStorageCharge || 0);
      const totalPaid = (item.charges?.handlingChargePaid || 0) + 
                       (item.charges?.bagChargePaid || 0) + 
                       (item.charges?.advanceStorageChargesPaid || 0);
      const netAmountDue = totalCharges - totalPaid;
      return (
        <div className="cell-content">
          <div className="primary-text">₹{netAmountDue.toLocaleString()}</div>
        </div>
      );
    },
    
    createdBy: (item) => (
      <div className="cell-content">
        <div className="primary-text">{item.createdBy || '--'}</div>
        {item.createdOn && (
          <div className="secondary-text">
            {new Date(item.createdOn).toLocaleDateString('en-IN')}
          </div>
        )}
      </div>
    ),
    
    status: (item) => {
      // Determine status based on charges paid vs total
      const totalDue = (item.charges?.handlingChargeDue || 0) + 
                      (item.charges?.bagChargeDue || 0) + 
                      (item.charges?.storageChargeDue || 0);
      const status = totalDue > 0 ? 'PENDING' : 'COMPLETED';
      
      return (
        <span
          className="status-badge"
          style={{ backgroundColor: getStatusColor(status) }}
        >
          {status}
        </span>
      );
    },
    
    action: (item) => (
      <div className="action-buttons">
        <button 
          className="btn-action"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleEditAgreement(item);
          }}
          title="Edit Agreement"
        >
          Edit
        </button>
        <button 
          className="btn-action"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleStorageAgreement(item);
          }}
          title="Manage Storage"
        >
          Storage
        </button>
        <button 
          className="btn-action"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handlePrintAgreement(item);
          }}
          title="Print Agreement"
        >
          Print
        </button>
      </div>
    )
  };

  // Fetch agreements history
  const fetchHistory = useCallback(async (pageNum = 1, reset = false) => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      const activeFilters = {};
      if (filters.agreementNumber) activeFilters.agreementNumber = filters.agreementNumber;
      if (filters.customerName) activeFilters.customerName = filters.customerName;
      if (filters.mobile) activeFilters.mobile = filters.mobile;
      if (filters.village) activeFilters.village = filters.village;
      if (filters.dateFrom) activeFilters.dateFrom = filters.dateFrom;
      if (filters.dateTo) activeFilters.dateTo = filters.dateTo;
      
      const queryParams = new URLSearchParams({
        page: pageNum,
        limit: 100,
        ...activeFilters
      });

      const response = await fetch(`${buildApiUrl(API_ENDPOINTS.AGREEMENTS_HISTORY)}?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch agreement history');

      const data = await response.json();

      if (reset) {
        setAgreements(data.data);
        // Update summary to match backend structure
        setSummary({
          totalAgreements: data.summary.totalAgreements || 0,
          totalWeightInQuintal: data.summary.totalQuintals || 0,
          totalNumberOfBags: data.summary.totalBags || 0,
          totalAmount: data.summary.totalAmount || 0,
          totalPaldariCost: data.summary.totalPaldariCost || 0,
          totalPaldariPaid: data.summary.totalPaldariPaid || 0,
          totalPaldariDues: data.summary.totalPaldariDues || 0
        });
      } else {
        setAgreements(prev => [...prev, ...data.data]);
      }

      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Apply filters
  const handleApplyFilters = () => {
    setPage(1);
    setAgreements([]);
    fetchHistory(1, true);
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      agreementNumber: '',
      customerName: '',
      mobile: '',
      village: '',
      dateFrom: '',
      dateTo: ''
    });
    
    setPage(1);
    setAgreements([]);
    fetchHistory(1, true);
  };

  // Handle infinite scroll
  const handleLoadMore = () => {
    fetchHistory(page + 1, false);
  };

  // Handle edit agreement
  const handleEditAgreement = (agreement) => {
    console.log('✏️ Navigating to Edit Agreement:', agreement.agreementId);
    
    if (navigateToView) {
      navigateToView('edit-agreement', {
        agreementId: agreement._id, // Use MongoDB ObjectId for navigation
        agreementNumber: agreement.agreementId,
        agreementData: agreement
      });
    }
  };

  // Handle storage agreement
  const handleStorageAgreement = (agreement) => {
    console.log('📦 Navigating to Agreement Storage:', agreement.agreementId);
    
    if (navigateToView) {
      navigateToView('agreement-storage', {
        agreementId: agreement._id, // Use MongoDB ObjectId for navigation
        agreementNumber: agreement.agreementId,
        agreementData: agreement
      });
    }
  };

  // Handle print agreement
  const handlePrintAgreement = async (agreement) => {
    console.log('🖨️ Print Agreement Letter called:', agreement);
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

  // Handle export to PDF
  const handleExportPDF = () => {
    if (agreements.length === 0) {
      alert('No data to export');
      return;
    }

    // Create a printable HTML document
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to export PDF');
      return;
    }

    // Generate HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Agreement History Report</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            font-size: 12px;
          }
          
          .report-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          
          .report-header h1 {
            font-size: 20px;
            margin-bottom: 5px;
          }
          
          .report-header .date {
            font-size: 11px;
            color: #666;
          }
          
          .summary-section {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 20px;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 5px;
          }
          
          .summary-item {
            text-align: center;
          }
          
          .summary-label {
            font-size: 10px;
            color: #666;
            margin-bottom: 3px;
          }
          
          .summary-value {
            font-size: 14px;
            font-weight: bold;
            color: #333;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          
          th {
            background-color: #4CAF50;
            color: white;
            font-weight: bold;
            font-size: 11px;
          }
          
          td {
            font-size: 10px;
          }
          
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          
          .text-right {
            text-align: right;
          }
          
          .text-center {
            text-align: center;
          }
          
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
          
          @media print {
            body {
              padding: 10px;
            }
            
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>Agreement History Report</h1>
          <div class="date">Generated on: ${new Date().toLocaleString('en-IN')}</div>
        </div>
        
        <div class="summary-section">
          <div class="summary-item">
            <div class="summary-label">Total Agreements</div>
            <div class="summary-value">${summary.totalAgreements}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total Weight</div>
            <div class="summary-value">${summary.totalWeightInQuintal} Q</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total Bags</div>
            <div class="summary-value">${summary.totalNumberOfBags}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total Paldari</div>
            <div class="summary-value">₹${summary.totalPaldariCost?.toLocaleString()}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Paldari Paid</div>
            <div class="summary-value">₹${summary.totalPaldariPaid?.toLocaleString()}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Paldari Due</div>
            <div class="summary-value">₹${summary.totalPaldariDues?.toLocaleString()}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total Amount Due</div>
            <div class="summary-value">₹${summary.totalAmount?.toLocaleString()}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Agreement No</th>
              <th>Date</th>
              <th>Lot Number</th>
              <th>Customer Name</th>
              <th>Mobile</th>
              <th>Village</th>
              <th class="text-right">Weight (Q)</th>
              <th class="text-right">Bags</th>
              <th class="text-right">Paldari Total</th>
              <th class="text-right">Paldari Paid</th>
              <th class="text-right">Paldari Due</th>
              <th class="text-right">Amount Due</th>
            </tr>
          </thead>
          <tbody>
            ${agreements.map((item, index) => {
              const totalCharges = (item.charges?.handlingChargeTotal || 0) + 
                                  (item.charges?.bagChargeTotal || 0) + 
                                  (item.charges?.totalStorageCharge || 0);
              const totalPaid = (item.charges?.handlingChargePaid || 0) + 
                               (item.charges?.bagChargePaid || 0) + 
                               (item.charges?.advanceStorageChargesPaid || 0);
              const netAmountDue = totalCharges - totalPaid;
              
              return `
                <tr>
                  <td class="text-center">${index + 1}</td>
                  <td>${item.agreementId || '--'}</td>
                  <td>${item.agreementDate ? new Date(item.agreementDate).toLocaleDateString('en-IN') : '--'}</td>
                  <td>${item.lotNumber || '--'}</td>
                  <td>${item.customerName || '--'}</td>
                  <td>${item.mobile || '--'}</td>
                  <td>${item.addressLine1 || '--'}</td>
                  <td class="text-right">${item.weightInQuintal || 0}</td>
                  <td class="text-right">${item.numberOfBags || 0}</td>
                  <td class="text-right">₹${(item.charges?.handlingChargeTotal || 0).toLocaleString()}</td>
                  <td class="text-right">₹${(item.charges?.handlingChargePaid || 0).toLocaleString()}</td>
                  <td class="text-right">₹${(item.charges?.handlingChargeDue || 0).toLocaleString()}</td>
                  <td class="text-right">₹${netAmountDue.toLocaleString()}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>This is a computer-generated report. Total records: ${agreements.length}</p>
          <p>Filters Applied: ${Object.entries(filters).filter(([_, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None'}</p>
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 4px;">
            Print / Save as PDF
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; font-size: 14px; cursor: pointer; background: #f44336; color: white; border: none; border-radius: 4px; margin-left: 10px;">
            Close
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return '#28a745';
      case 'PENDING': return '#ffc107';
      case 'ACTIVE': return '#007bff';
      case 'CANCELLED': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // Initial load
  useEffect(() => {
    fetchHistory(1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="agreement-module">
      {/* Header */}
      <div className="module-header">
        <div className="header-content">
          <h1>Agreement Management</h1>
          <button 
            className="btn-export-pdf"
            onClick={handleExportPDF}
            disabled={agreements.length === 0}
            title="Export Agreement History to PDF"
          >
            📄 Export PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ✗ {error}
        </div>
      )}

      {/* Filters */}
      <div className="filter-section">
        <div className="filter-grid">
          <div className="filter-group">
            <label>Agreement Number</label>
            <input
              type="text"
              name="agreementNumber"
              value={filters.agreementNumber}
              onChange={handleFilterChange}
              placeholder={placeholders.agreementNumber}
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
        <div className="summary-card">
          <div className="summary-label">Total Agreements</div>
          <div className="summary-value">{summary.totalAgreements}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Weight</div>
          <div className="summary-value">{summary.totalWeightInQuintal} Q</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Bags</div>
          <div className="summary-value">{summary.totalNumberOfBags}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Paldari</div>
          <div className="summary-value">₹{summary.totalPaldariCost?.toLocaleString()}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Paldari Paid</div>
          <div className="summary-value">₹{summary.totalPaldariPaid?.toLocaleString()}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Paldari Due</div>
          <div className="summary-value">₹{summary.totalPaldariDues?.toLocaleString()}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Amount Due</div>
          <div className="summary-value">₹{summary.totalAmount?.toLocaleString()}</div>
        </div>
      </div>

      {/* Data Table with Column Management */}
      <DataTable
        data={agreements}
        viewKey="agreement-history"
        userId={user?.id}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        customRenderers={customRenderers}
        className="agreement-table"
        maxHeight="600px"
      />

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

export default AgreementModule;