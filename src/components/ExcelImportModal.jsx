import React, { useRef } from 'react';
import { FileSpreadsheet, UploadCloud, X } from 'lucide-react';

export default function ExcelImportModal({ isOpen, onClose }) {
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      alert(`Selected file: "${e.target.files[0].name}". Mapping 17 Excel columns...`);
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="email-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="email-modal-header">
          <div className="email-meta">
            <FileSpreadsheet size={20} />
            <div>
              <h3>Bulk Import Customers from Excel (.XLSX)</h3>
              <p>Maps all 17 Excel columns (NO., NAME, CA, PAN, DPID, Bank A/c...)</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="email-body-box">
          <div className="excel-upload-zone">
            <UploadCloud className="upload-icon" />
            <h4>Drag & Drop your customer Excel file here</h4>
            <p>Or click to browse file (.xlsx, .csv)</p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn btn-secondary margin-top"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              Browse File
            </button>
          </div>

          <div className="column-mapping-list margin-top">
            <h4>17 Excel Columns Standard Mapping:</h4>
            <ul className="mapping-grid">
              <li><code>NO.</code> → customer_no</li>
              <li><code>NAME</code> → name</li>
              <li><code>CA</code> → ca_number</li>
              <li><code>PAN</code> → pan_number (Unique)</li>
              <li><code>DPID</code> → dpid</li>
              <li><code>Bank A/c No.</code> → bank_account_no</li>
              <li><code>Login ID</code> → login_id</li>
              <li><code>PASS</code> → password_encrypted</li>
              <li><code>CODE</code> → code</li>
              <li><code>Mobile Number</code> → mobile_number</li>
              <li><code>BALANCE</code> → balance</li>
              <li><code>Phone Kono chhe</code> → phone_alternate</li>
              <li><code>email</code> → email</li>
              <li><code>Phone</code> → phone_other</li>
              <li><code>RETURN</code> → return_amount</li>
              <li><code>TDS remarks</code> → tds_remarks</li>
              <li><code>Beneficiary</code> → beneficiary_name</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
