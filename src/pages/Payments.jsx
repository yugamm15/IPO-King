import React from 'react';
import { Wallet } from 'lucide-react';

export default function Payments() {
  return (
    <div className="tab-pane active">
      <div className="welcome-header">
        <div>
          <h2><Wallet size={22} /> Payments & Profit Distribution (40-60 Split & 10% TDS)</h2>
          <p>Manual bank transfers, beneficiary payouts, and TDS tax ledger</p>
        </div>
      </div>

      <div className="card glass-panel">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Txn ID</th>
                <th>Customer</th>
                <th>Beneficiary Account</th>
                <th>Transaction Type</th>
                <th>Amount (₹)</th>
                <th>40% Profit Share</th>
                <th>10% TDS</th>
                <th>Payout Net</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>TXN-8801</code></td>
                <td>Amit Kumar Patel</td>
                <td>Priya Patel (HDFC •••• 5678)</td>
                <td>Profit Distribution</td>
                <td>₹ 6,840.00</td>
                <td>₹ 2,736.00</td>
                <td>₹ 273.60</td>
                <td><strong>₹ 2,462.40</strong></td>
                <td><span className="status-badge open">Verified</span></td>
                <td><button className="btn-xs btn-outline">Receipt</button></td>
              </tr>
              <tr>
                <td><code>TXN-8802</code></td>
                <td>Rajesh Sharma</td>
                <td>Sonia Sharma (ICICI •••• 9012)</td>
                <td>Profit Distribution</td>
                <td>₹ 14,980.00</td>
                <td>₹ 5,992.00</td>
                <td>₹ 599.20</td>
                <td><strong>₹ 5,392.80</strong></td>
                <td><span className="status-badge open">Verified</span></td>
                <td><button className="btn-xs btn-outline">Receipt</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
