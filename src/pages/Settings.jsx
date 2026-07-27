import React from 'react';
import { Settings as SettingsIcon, Database } from 'lucide-react';

export default function Settings() {
  return (
    <div className="tab-pane active">
      <div className="welcome-header">
        <div>
          <h2><SettingsIcon size={22} /> System Configuration & Database Settings</h2>
          <p>Manage TDS rate (10%), profit sharing formulas, users, and DB toggle</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card glass-panel">
          <h3>System Parameters</h3>
          <div className="calc-group margin-top">
            <label>Standard TDS Tax Rate (%)</label>
            <input type="number" value="10.00" readOnly />
          </div>
          <div className="calc-group">
            <label>Customer Profit Share (%)</label>
            <input type="number" value="40.00" readOnly />
          </div>
          <div className="calc-group">
            <label>Company Profit Share (%)</label>
            <input type="number" value="60.00" readOnly />
          </div>
        </div>

        <div className="card glass-panel">
          <h3>Active Database Connection</h3>
          <p className="cell-sub margin-top">Connected to <strong>Supabase Cloud PostgreSQL</strong> (Free Tier)</p>
          <div className="db-pill margin-top">
            <Database size={14} /> Supabase URL: db.xxxx.supabase.co
          </div>
          <p class="cell-sub margin-top">Toggle to MySQL ready in <code>.env</code> file anytime!</p>
        </div>
      </div>
    </div>
  );
}
