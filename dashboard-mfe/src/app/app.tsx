import React, { useState } from 'react';
import './app.css';

interface Metric {
  label: string;
  value: string | number;
  change: number;
  icon: string;
}

export function App() {
  const [metrics] = useState<Metric[]>([
    { label: 'Total Users', value: '1,245', change: 12.5, icon: '👥' },
    { label: 'Revenue', value: '$54,321', change: 8.3, icon: '💰' },
    { label: 'Active Projects', value: 28, change: -2.1, icon: '📊' },
    { label: 'Completion Rate', value: '89%', change: 5.7, icon: '✅' },
  ]);

  const [chartData] = useState([
    { month: 'Jan', value: 65 },
    { month: 'Feb', value: 78 },
    { month: 'Mar', value: 72 },
    { month: 'Apr', value: 85 },
    { month: 'May', value: 92 },
    { month: 'Jun', value: 88 },
  ]);

  return (
    <div className="dashboard-mfe">
      <div className="mfe-header">
        <h1>📊 Analytics Dashboard</h1>
        <p>Real-time analytics and business intelligence</p>
      </div>

      <div className="metrics-grid">
        {metrics.map((metric, index) => (
          <div key={index} className="metric-card">
            <div className="metric-icon">{metric.icon}</div>
            <div className="metric-content">
              <h3>{metric.value}</h3>
              <p>{metric.label}</p>
              <span className={`metric-change ${metric.change > 0 ? 'positive' : 'negative'}`}>
                {metric.change > 0 ? '↑' : '↓'} {Math.abs(metric.change)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="chart-container">
        <h2>Monthly Performance</h2>
        <div className="simple-chart">
          {chartData.map((data, index) => (
            <div key={index} className="chart-bar-container">
              <div
                className="chart-bar"
                style={{ height: `${data.value}%` }}
              >
                <span className="bar-value">{data.value}</span>
              </div>
              <span className="bar-label">{data.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="recent-activity">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          <div className="activity-item">
            <span className="activity-icon">📝</span>
            <div className="activity-content">
              <p>New user registration: John Doe</p>
              <span className="activity-time">2 minutes ago</span>
            </div>
          </div>
          <div className="activity-item">
            <span className="activity-icon">💳</span>
            <div className="activity-content">
              <p>Payment received: $1,250</p>
              <span className="activity-time">15 minutes ago</span>
            </div>
          </div>
          <div className="activity-item">
            <span className="activity-icon">🚀</span>
            <div className="activity-content">
              <p>Project "Alpha" deployed to production</p>
              <span className="activity-time">1 hour ago</span>
            </div>
          </div>
          <div className="activity-item">
            <span className="activity-icon">⚠️</span>
            <div className="activity-content">
              <p>System maintenance scheduled for tomorrow</p>
              <span className="activity-time">3 hours ago</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mfe-info">
        <p>📍 This is the Dashboard MFE running on port 4202</p>
      </div>
    </div>
  );
}

export default App;
