import React from 'react';
import { FileSpreadsheet, Plus } from 'lucide-react';

export default function Applications() {
  return (
    <div className="tab-pane active">
      <div className="welcome-header">
        <div>
          <h2><FileSpreadsheet size={22} /> Customer IPO Applications</h2>
          <p>Track applied vs allotted quantities, allotment statuses, and funds flow</p>
        </div>
        <div className="quick-actions">
          <button className="btn btn-primary">
            <Plus size={16} /> New Application
          </button>
        </div>
      </div>

      <div className="card glass-panel">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>App ID</th>
                <th>Customer</th>
                <th>PAN</th>
                <th>IPO Name</th>
                <th>Applied Qty</th>
                <th>Amount Paid</th>
                <th>Allotted Qty</th>
                <th>Allotment Status</th>
                <th>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>APP-1001</code></td>
                <td>Amit Kumar Patel</td>
                <td><code>AAAPA1234X</code></td>
                <td>Swiggy Ltd</td>
                <td>38 shares</td>
                <td>₹ 14,820.00</td>
                <td>38 shares</td>
                <td><span className="status-badge full">Full Allotment</span></td>
                <td><span className="status-badge open">Completed</span></td>
              </tr>
              <tr>
                <td><code>APP-1002</code></td>
                <td>Rajesh Sharma</td>
                <td><code>BBBPB5678Y</code></td>
                <td>Bajaj Housing</td>
                <td>428 shares</td>
                <td>₹ 29,960.00</td>
                <td>214 shares</td>
                <td><span className="status-badge partial">Partial</span></td>
                <td><span className="status-badge open">Refund Processed</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
