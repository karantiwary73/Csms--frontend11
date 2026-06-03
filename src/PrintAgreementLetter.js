import React from 'react';
import './PrintAgreementLetter.css';

const PrintAgreementLetter = ({ agreement, user, onClose }) => {
  console.log('PrintAgreementLetter component rendered with:', { agreement, user });
  
  const handlePrint = () => {
    console.log('Print button clicked');
    const printContent = document.querySelector('.print-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    // Get the PrintAgreementLetter CSS
    const cssLink = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => el.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Agreement</title>
        ${cssLink}
      </head>
      <body>
        <div class="print-content">${printContent.innerHTML}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  if (!agreement) {
    console.log('No agreement data provided to PrintAgreementLetter');
    return (
      <div className="print-overlay">
        <div className="print-controls no-print">
          <button onClick={onClose} className="close-button">
            ✕ Close
          </button>
        </div>
        <div className="print-content">
          <p>No agreement data available for printing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="print-overlay">
      <div className="print-controls no-print">
        <button onClick={handlePrint} className="print-button">
          🖨️ Print
        </button>
        <button onClick={onClose} className="close-button">
          ✕ Close
        </button>
      </div>

      <div className="print-content">
        {/* Top spacing - increased to 80px */}
        <div style={{ height: '80px' }}></div>

        {/* Original Copy header */}
        <div className="original-copy-header">
          <strong>Original Copy</strong>
        </div>

        {/* Agreement details in two columns */}
        <div className="agreement-details">
          <div className="left-column">
            <div className="detail-row">
              <span className="label">Lot No:</span>
              <span className="value lot-number">{agreement.lotNumber}</span>
            </div>
            <div className="detail-row">
              <span className="label">Agreement No:</span>
              <span className="value">{agreement.agreementId}</span>
            </div>
            <div className="detail-row">
              <span className="label">Name:</span>
              <span className="value">{agreement.customerName || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="label">S/o.:</span>
              <span className="value">{agreement.fatherName || '--'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Contact No:</span>
              <span className="value">{agreement.mobile || 'N/A'}</span>
            </div>
          </div>

          <div className="right-column">
            <div className="detail-row">
              <span className="label">Reservation No:</span>
              <span className="value">{agreement.reservationNumber || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Agreement Date:</span>
              <span className="value">{formatDate(agreement.agreementDate)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Village:</span>
              <span className="value">{agreement.addressLine1 || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Post Office:</span>
              <span className="value">{agreement.addressLine2 || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="label">District:</span>
              <span className="value">{agreement.district || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Dotted line separator */}
        <div className="dotted-separator"></div>

        {/* Storage details table */}
        <table className="storage-table">
          <thead>
            <tr>
              <th>BAGS</th>
              <th>WEIGHT(Qtl)</th>
              <th>RATE(Qtl)</th>
              <th>AMOUNT</th>
              <th>ADV. AMT</th>
              <th>NET. AMT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{agreement.numberOfBags}</td>
              <td>{agreement.weightInQuintal}</td>
              <td>{agreement.ratePerQuintal}</td>
              <td>{agreement.charges?.totalStorageCharge || 0}</td>
              <td>{agreement.charges?.advanceStorageChargesPaid || 0}</td>
              <td>{agreement.charges?.dueStorageCharge || 0}</td>
            </tr>
          </tbody>
        </table>

        {/* Additional details */}
        <div className="additional-details">
          <div className="left-section">
            <div className="detail-row">
              <span className="label">RST No:</span>
              <span className="value">--</span>
            </div>
            <div className="detail-row">
              <span className="label">Product Name:</span>
              <span className="value">{agreement.product}</span>
            </div>
            <div className="detail-row">
              <span className="label">Description:</span>
              <span className="value">--</span>
            </div>
          </div>

          <div className="middle-section">
            <div className="detail-row">
              <span className="label">Transport:</span>
              <span className="value">--</span>
            </div>
          </div>

          <div className="right-section">
            <div className="detail-row">
              <span className="label">Paldari Total:</span>
              <span className="value">{agreement.charges?.handlingChargeTotal || 0}</span>
            </div>
            <div className="detail-row">
              <span className="label">Paldari Paid:</span>
              <span className="value">{agreement.charges?.handlingChargePaid || 0}</span>
            </div>
            <div className="detail-row">
              <span className="label">Bag Charges:</span>
              <span className="value">{agreement.charges?.bagChargeTotal || 0}</span>
            </div>
            <div className="detail-row">
              <span className="label">Paldari Dues:</span>
              <span className="value">{agreement.charges?.handlingChargeDue || 0}</span>
            </div>
            <div className="detail-row">
              <span className="label">Total Amount Due:</span>
              <span className="value">{agreement.charges?.totalDue || 0}</span>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="footer-note">
          <p>10 अक्टूबर के बाद किराया 301.00 रुपए प्रति क्विंटल लगा।</p>
        </div>

        {/* User signature */}
        <div className="user-signature">
          <p><strong>{user?.name || 'Unknown User'}</strong></p>
        </div>
      </div>
    </div>
  );
};

export default PrintAgreementLetter;