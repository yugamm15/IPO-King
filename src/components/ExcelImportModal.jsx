import React, { useState, useRef, useCallback } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Trash2,
  FileCheck
} from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import * as XLSX from 'xlsx';
import { bulkImportCustomers, bulkInsertApplications, supabase } from '../services/db.js';

/**
 * Excel Customer Manager Modal powered by Watermelon UI File-Upload-2 & Hero-11 Theme
 */
export default function ExcelImportModal({ isOpen, onClose, customers = [] }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'export'
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileProgress, setFileProgress] = useState(0);
  const [fileStatus, setFileStatus] = useState('idle'); // 'idle' | 'ready' | 'uploading' | 'success' | 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processSelectedFile(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      showToast('Please upload a valid Excel or CSV document (.xlsx, .xls, .csv)', 'warning');
      return;
    }

    setSelectedFile(file);
    setFileStatus('ready');
    setFileProgress(100);
    setStatusMessage(`File "${file.name}" ready to import.`);
  };

  const handleImportSubmit = async () => {
    if (!selectedFile) {
      showToast('Please select an Excel (.xlsx, .xls, .csv) file to import.', 'warning');
      return;
    }

    setFileStatus('uploading');
    setStatusMessage('Reading workbook and parsing customer columns...');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheet = workbook.SheetNames[0];

          if (!firstSheet) {
            setFileStatus('error');
            setStatusMessage('⚠️ The uploaded workbook contains no sheets.');
            showToast('No sheets found in Excel workbook.', 'warning');
            return;
          }

          const worksheet = workbook.Sheets[firstSheet];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

          if (!rawRows || rawRows.length === 0) {
            setFileStatus('error');
            setStatusMessage('⚠️ No customer data rows found. Check column headers.');
            showToast('No customer data rows found to import.', 'warning');
            return;
          }

          setStatusMessage(`Syncing ${rawRows.length} customer records into database...`);
          const result = await bulkImportCustomers(rawRows);

          if (result.count > 0) {
            setFileStatus('success');
            const skipMsg = result.errors && result.errors.length > 0 ? ` (${result.errors.length} skipped)` : '';
            setStatusMessage(`✅ Success! Imported / updated ${result.count} customers${skipMsg}.`);
            showToast(`Successfully imported ${result.count} customers!`, 'success');

            // Dispatch global event so Customers page reloads immediately
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('ipoking:refresh-data'));
            }

            setTimeout(() => {
              setSelectedFile(null);
              setFileStatus('idle');
              setStatusMessage('');
              onClose();
            }, 1400);
          } else {
            setFileStatus('error');
            const firstErr = result.errors && result.errors[0] ? result.errors[0] : 'Could not save customer rows.';
            setStatusMessage(`❌ ${firstErr}`);
            showToast(firstErr, 'error');
          }
        } catch (innerErr) {
          console.error('Spreadsheet processing error:', innerErr);
          setFileStatus('error');
          setStatusMessage(`❌ Error parsing file: ${innerErr.message}`);
          showToast(`Error parsing file: ${innerErr.message}`, 'error');
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    } catch (err) {
      console.error('File read error:', err);
      setFileStatus('error');
      setStatusMessage('❌ Error reading file. Please check format.');
      showToast('Failed to import file.', 'error');
    }
  };

  const handleDownloadSample = () => {
    const headers = [
      'NO.', 'NAME', 'CA', 'PAN', 'AADHAAR', 'BIRTHDATE', 'DPID', 'BANK NAME', 'Bank A/c No.', 'Login ID', 'PASS',
      'CODE', 'Mobile Number', 'BALANCE', 'Phone Kono chhe', 'email', 'Phone',
      'RETURN', 'TDS remarks', 'PROFIT SHARE (%)', 'Beneficiary'
    ];
    const sampleRow = [
      1, 'Amit Patel', 'AC123456', 'AAAPA1234X', '567812349012', '1992-05-15', '1208160012345678', 'HDFC Bank', '50100234567890',
      'amit_p', 'Arham', 'IPO-001', '9876543210', 50000, '9876543211',
      'amit@example.com', '9123456789', 1500, '10% TDS Deducted', 40, 'Priya Patel'
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'IPO_KING_Customer_Import_Template.xlsx');
  };

  const handleExportCustomers = async () => {
    const headers = [
      'NO.', 'NAME', 'CA', 'PAN', 'AADHAAR', 'BIRTHDATE', 'DPID', 'BANK NAME', 'Bank A/c No.', 'Login ID', 'PASS',
      'CODE', 'Mobile Number', 'BALANCE', 'Phone Kono chhe', 'email', 'Phone',
      'RETURN', 'TDS remarks', 'PROFIT SHARE (%)', 'Beneficiary'
    ];

    let dataToExport = customers && customers.length > 0 ? customers : [];
    if (dataToExport.length === 0) {
      try {
        const { data } = await supabase.from('customers').select('*').order('customer_no', { ascending: true });
        if (data && data.length > 0) {
          dataToExport = data;
        }
      } catch (_) {}
    }

    if (dataToExport.length === 0) {
      dataToExport = [
        {
          customer_no: 1, full_name: 'Sample Customer', ca_number: 'AC123456', pan_number: 'ABCDE1234F',
          aadhaar_number: '567812349012', birthdate: '1992-05-15',
          dpid: '1208160012345678', bank_name: 'HDFC Bank', bank_account_no: '50100234567890', login_id: 'sample_user',
          password_encrypted: 'Arham', code: 'IPO-001', mobile_number: '9876543210',
          balance: 50000, phone_alternate: '9876543211', email: 'sample@email.com',
          phone_other: '9123456789', return_amount: 1500, tds_remarks: '10% TDS Deducted',
          profit_share_percentage: 40, beneficiary_name: 'Beneficiary Name'
        }
      ];
    }

    const rows = dataToExport.map(c => [
      c.customer_no || '',
      c.full_name || c.name || '',
      c.ca_number || '',
      c.pan_number || '',
      c.aadhaar_number || c.aadhar_number || '',
      c.birthdate || c.dob || '',
      c.dpid || '',
      c.bank_name || '',
      c.bank_account_no || '',
      c.login_id || '',
      c.password_encrypted || '',
      c.code || '',
      c.mobile_number || '',
      c.balance || 0,
      c.phone_alternate || '',
      c.email || '',
      c.phone_other || '',
      c.return_amount || 0,
      c.tds_remarks || '',
      c.profit_share_percentage !== undefined && c.profit_share_percentage !== null ? c.profit_share_percentage : 40,
      c.beneficiary_name || ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, `IPO_KING_Customers_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    return `${(bytes / k).toFixed(1)} KB`;
  };

  const mappings = [
    { col: 'NO.', db: 'customer_no' },
    { col: 'NAME', db: 'full_name' },
    { col: 'CA', db: 'ca_number' },
    { col: 'PAN', db: 'pan_number' },
    { col: 'AADHAAR', db: 'aadhaar_number' },
    { col: 'BIRTHDATE', db: 'birthdate' },
    { col: 'DPID', db: 'dpid' },
    { col: 'Bank A/c No.', db: 'bank_account_no' },
    { col: 'Login ID', db: 'login_id' },
    { col: 'PASS', db: 'password_encrypted' },
    { col: 'CODE', db: 'code' },
    { col: 'Mobile Number', db: 'mobile_number' },
    { col: 'BALANCE', db: 'balance' },
    { col: 'Phone Kono chhe', db: 'phone_alternate' },
    { col: 'email', db: 'email' },
    { col: 'Phone', db: 'phone_other' },
    { col: 'RETURN', db: 'return_amount' },
    { col: 'TDS remarks', db: 'tds_remarks' },
    { col: 'Beneficiary', db: 'beneficiary_name' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '720px', borderRadius: '32px', padding: '0', overflow: 'hidden' }}
      >
        {/* Hero-11 Modal Header */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid var(--panel-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--panel-bg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'rgba(4, 47, 46, 0.06)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 700, color: 'var(--text-main)' }}>
                Excel Customer Manager
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                Bulk Import & Export 17 Customer Excel Fields
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(4, 47, 46, 0.05)',
              border: 'none',
              borderRadius: '10px',
              width: '34px',
              height: '34px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection (Hero-11 Pill Style) */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 28px', background: 'var(--table-header-bg)', borderBottom: '1px solid var(--panel-border)' }}>
          <button
            onClick={() => setActiveTab('import')}
            className={`btn ${activeTab === 'import' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '10px' }}
          >
            <UploadCloud size={15} /> Bulk Import (.XLSX)
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`btn ${activeTab === 'export' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '10px' }}
          >
            <Download size={15} /> Bulk Export (.CSV / .XLSX)
          </button>
        </div>

        {/* Modal Body with Watermelon File-Upload-2 */}
        <div style={{ padding: '28px', overflowY: 'auto', maxHeight: 'calc(92vh - 160px)' }}>
          {activeTab === 'import' ? (
            <div>
              {/* File-Upload-2 Dropzone */}
              <div
                className={`file-upload-2-dropzone ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(4, 47, 46, 0.08)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  transition: 'transform 0.2s ease'
                }}>
                  <UploadCloud size={30} />
                </div>

                <h4 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Click to upload <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>or drag and drop</span>
                </h4>
                <p style={{ margin: '0 0 18px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  XLSX, XLS, or CSV format (17 mapped customer columns)
                </p>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '8px 18px', fontSize: '13px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Browse Files
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadSample();
                    }}
                  >
                    <Download size={14} /> Download Sample Template
                  </button>
                </div>
              </div>

              {/* Uploaded File Queue Item (Watermelon File-Upload-2 File Card) */}
              {selectedFile && (
                <div style={{
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '16px',
                  padding: '16px',
                  marginTop: '18px',
                  boxShadow: '0 2px 8px rgba(4, 47, 46, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'rgba(4, 47, 46, 0.06)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <FileCheck size={22} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
                          {selectedFile.name}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {fileStatus === 'success' && (
                            <span className="badge badge-success">
                              <CheckCircle2 size={12} /> Done
                            </span>
                          )}
                          {fileStatus === 'error' && (
                            <span className="badge badge-danger">
                              <AlertCircle size={12} /> Failed
                            </span>
                          )}
                          {fileStatus === 'ready' && (
                            <span className="badge badge-teal">
                              Ready to Parse
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              setFileStatus('idle');
                              setStatusMessage('');
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                            aria-label="Remove File"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span>{formatFileSize(selectedFile.size)}</span>
                        {statusMessage && (
                          <>
                            <span>•</span>
                            <span style={{ color: fileStatus === 'error' ? 'var(--danger)' : 'var(--text-muted)' }}>
                              {statusMessage}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {fileStatus !== 'success' && (
                    <button
                      type="button"
                      onClick={handleImportSubmit}
                      className="btn btn-teal"
                      style={{ width: '100%', marginTop: '14px', padding: '10px', fontSize: '14px' }}
                      disabled={fileStatus === 'uploading'}
                    >
                      {fileStatus === 'uploading' ? 'Importing Applications...' : 'Confirm & Import to Database'}
                    </button>
                  )}
                </div>
              )}

              {/* 17 Mapped Columns Specification */}
              <div style={{ marginTop: '24px' }}>
                <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brand-accent)', fontWeight: 700, marginBottom: '12px' }}>
                  17 Excel Columns Auto-Mapped:
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                  {mappings.map((m, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(4, 47, 46, 0.03)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--panel-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px'
                    }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{m.col}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>&rarr; {m.db}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{
                background: 'rgba(4, 47, 46, 0.02)',
                border: '1px solid var(--panel-border)',
                borderRadius: '24px',
                padding: '36px 24px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(4, 47, 46, 0.08)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto'
                }}>
                  <Download size={32} />
                </div>

                <h4 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Export All Customer Records
                </h4>
                <p style={{ margin: '0 auto 24px auto', fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '440px' }}>
                  Download all registered customer records with all 17 Excel fields formatted and ready for accounting or offline analysis.
                </p>

                <button
                  type="button"
                  onClick={handleExportCustomers}
                  className="btn btn-primary"
                  style={{ padding: '12px 28px', fontSize: '14px' }}
                >
                  <Download size={16} /> Export Customers to Excel (.CSV)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
