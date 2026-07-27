import React from 'react';
import { Layers, Plus } from 'lucide-react';

export default function IpoMaster() {
  return (
    <div className="tab-pane active">
      <div className="welcome-header">
        <div>
          <h2><Layers size={22} /> IPO Master Catalog & Listing Pipeline</h2>
          <p>Create IPOs, manage price bands, and trigger automated listing profit calculation</p>
        </div>
        <div className="quick-actions">
          <button className="btn btn-primary">
            <Plus size={16} /> Create New IPO
          </button>
        </div>
      </div>

      <div className="card glass-panel">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>IPO Name</th>
                <th>Company</th>
                <th>Price Band (₹)</th>
                <th>Lot Size</th>
                <th>Issue Size</th>
                <th>Subscription Dates</th>
                <th>Allotment Date</th>
                <th>Listing Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Swiggy Ltd IPO</strong></td>
                <td>Swiggy India Pvt Ltd</td>
                <td>₹371 - ₹390</td>
                <td>38 shares</td>
                <td>₹11,327 Cr</td>
                <td>15 Nov - 19 Nov</td>
                <td>22 Nov 2026</td>
                <td>25 Nov 2026</td>
                <td><span className="status-badge open">Open</span></td>
                <td><button className="btn-xs btn-outline">Mark Listed</button></td>
              </tr>
              <tr>
                <td><strong>Tata Technologies</strong></td>
                <td>Tata Tech Ltd</td>
                <td>₹475 - ₹500</td>
                <td>30 shares</td>
                <td>₹3,042 Cr</td>
                <td>22 Nov - 25 Nov</td>
                <td>28 Nov 2026</td>
                <td>02 Dec 2026</td>
                <td><span className="status-badge upcoming">Upcoming</span></td>
                <td><button className="btn-xs btn-outline">Edit</button></td>
              </tr>
              <tr>
                <td><strong>Bajaj Housing Finance</strong></td>
                <td>Bajaj HFL</td>
                <td>₹66 - ₹70</td>
                <td>214 shares</td>
                <td>₹6,560 Cr</td>
                <td>09 Dec - 12 Dec</td>
                <td>16 Dec 2026</td>
                <td>20 Dec 2026</td>
                <td><span className="status-badge listed">Listed @ ₹150</span></td>
                <td><button className="btn-xs btn-primary">View Profit Split</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
