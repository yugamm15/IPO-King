import React from 'react';
import { Users, FileSpreadsheet, UserPlus } from 'lucide-react';

export default function Customers({ onOpenExcelModal }) {
  return (
    <div className="tab-pane active">
      <div className="welcome-header">
        <div>
          <h2><Users size={22} /> Customer Database (All 17 Excel Columns Mapped)</h2>
          <p>Manage customer profiles, demat accounts, bank details & 17-column bulk Excel import</p>
        </div>
        <div className="quick-actions">
          <button className="btn btn-primary" onClick={onOpenExcelModal}>
            <FileSpreadsheet size={16} /> Bulk Import Excel (17 Columns)
          </button>
          <button className="btn btn-secondary">
            <UserPlus size={16} /> Add New Customer
          </button>
        </div>
      </div>

      <div className="card glass-panel">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Name</th>
                <th>CA No.</th>
                <th>PAN Number</th>
                <th>DPID</th>
                <th>Bank A/c No.</th>
                <th>Login ID</th>
                <th>CODE</th>
                <th>Mobile</th>
                <th>Balance (₹)</th>
                <th>Alternate Phone</th>
                <th>Email</th>
                <th>KYC Status</th>
                <th>Beneficiary</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td><strong>Amit Kumar Patel</strong></td>
                <td>AC123456</td>
                <td><code>AAAPA1234X</code></td>
                <td>0012345678</td>
                <td>1234567890123</td>
                <td>amit_patel_24</td>
                <td>IPO-001</td>
                <td>9876543210</td>
                <td>₹ 50,000.00</td>
                <td>9876543211</td>
                <td>amit@email.com</td>
                <td><span className="status-badge open">Verified</span></td>
                <td>Priya Patel</td>
                <td><button className="btn-xs btn-outline">Edit</button></td>
              </tr>
              <tr>
                <td>2</td>
                <td><strong>Rajesh Sharma</strong></td>
                <td>AC987654</td>
                <td><code>BBBPB5678Y</code></td>
                <td>0098765432</td>
                <td>9876543210987</td>
                <td>rajesh_sharma</td>
                <td>IPO-002</td>
                <td>9123456789</td>
                <td>₹ 1,20,000.00</td>
                <td>9123456790</td>
                <td>rajesh@email.com</td>
                <td><span className="status-badge open">Verified</span></td>
                <td>Sonia Sharma</td>
                <td><button className="btn-xs btn-outline">Edit</button></td>
              </tr>
              <tr>
                <td>3</td>
                <td><strong>Priya Verma</strong></td>
                <td>—</td>
                <td><code>CCCPC9012Z</code></td>
                <td>0034567890</td>
                <td>4567890123456</td>
                <td>priya_v</td>
                <td>IPO-003</td>
                <td>8765432109</td>
                <td>₹ 35,000.00</td>
                <td>—</td>
                <td>priya@email.com</td>
                <td><span className="status-badge partial">Pending KYC</span></td>
                <td>Rohan Verma</td>
                <td><button className="btn-xs btn-outline">Edit</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
