import React, { useState, useEffect, useCallback } from 'react';
import './Dashboard.css';
import { getUnitName, getAllUnits } from './unitUtils';
import { buildApiUrl, API_ENDPOINTS } from './api';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const formatCurrency = (val) => {
  const n = Number(val) || 0;
  return '₹' + n.toLocaleString('en-IN');
};

const formatNumber = (val) => {
  const n = Number(val) || 0;
  return n.toLocaleString('en-IN');
};

const Dashboard = ({ user, token }) => {
  const units = getAllUnits();
  const isAdmin = user.role === 'ADMIN';

  // Date filter state
  const getToday = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };
  const getDateOffset = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };
  const getMonthStart = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  };

  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [activePreset, setActivePreset] = useState('all');
  const [selectedUnit, setSelectedUnit] = useState(user.unitId || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const applyPreset = (preset) => {
    setActivePreset(preset);
    const today = getToday();
    switch (preset) {
      case 'all':
        setDateRange({ start: '', end: '' });
        break;
      case 'today':
        setDateRange({ start: today, end: today });
        break;
      case 'yesterday': {
        const y = getDateOffset(1);
        setDateRange({ start: y, end: y });
        break;
      }
      case '7days':
        setDateRange({ start: getDateOffset(6), end: today });
        break;
      case '15days':
        setDateRange({ start: getDateOffset(14), end: today });
        break;
      case '30days':
        setDateRange({ start: getDateOffset(29), end: today });
        break;
      case 'this-month':
        setDateRange({ start: getMonthStart(), end: today });
        break;
      case 'custom':
        break;
      default:
        break;
    }
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      params.append('unitId', selectedUnit || 'all');

      const response = await fetch(
        `${buildApiUrl(API_ENDPOINTS.DASHBOARD_REPORT)}?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (!response.ok) throw new Error('Failed to fetch report');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedUnit, token]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Tooltip formatter for currency
  const currencyFormatter = (value) => formatCurrency(value);

  // Custom pie label
  const renderPieLabel = ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`;

  if (loading && !data) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const d = data || {};
  const kpi = d.kpi || {};
  const inv = d.inventory || {};
  const fin = d.financial || {};
  const pal = d.paldari || {};
  const ops = d.operational || {};
  const dues = d.dues || {};
  const charts = d.charts || {};

  // Build chart data
  const paymentPieData = (charts.paymentByMode || []).map(p => ({ name: p.mode, value: p.amount }));

  const finPieData = [
    { name: 'Payments', value: charts.financialOverview?.totalPayments || 0 },
    { name: 'Expenses', value: charts.financialOverview?.totalExpenses || 0 }
  ].filter(x => x.value > 0);

  const rebatePieData = [
    { name: 'Net Amount', value: charts.agreementVsRebate?.netAmount || 0 },
    { name: 'Rebate', value: charts.agreementVsRebate?.totalRebate || 0 }
  ].filter(x => x.value > 0);

  const invBarData = [
    { name: 'Agreed', bags: charts.inventoryStatus?.agreed || 0 },
    { name: 'Withdrawn', bags: charts.inventoryStatus?.withdrawn || 0 },
    { name: 'Remaining', bags: charts.inventoryStatus?.remaining || 0 }
  ];

  // Merge agreement and withdrawal trends for bar chart
  const trendMap = {};
  (charts.agreementTrend || []).forEach(a => {
    trendMap[a.date] = { ...(trendMap[a.date] || {}), date: a.date, agreements: a.count, agrBags: a.bags };
  });
  (charts.withdrawalTrend || []).forEach(w => {
    trendMap[w.date] = { ...(trendMap[w.date] || {}), date: w.date, withdrawals: w.count, wdrBags: w.bags };
  });
  const agrVsWdrData = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="report-dashboard">
      {/* ===== WELCOME BANNER ===== */}
      <div className="dash-welcome-banner">
        <div className="dash-welcome-text">
          <h2>Welcome back, {user.name || user.username}!</h2>
          <p>Here's what's happening in your system today.</p>
        </div>
        <div className="dash-welcome-user">
          <div className="dash-welcome-avatar">{(user.name || user.username || 'U').charAt(0).toUpperCase()}</div>
          <div className="dash-welcome-info">
            <strong>{user.name || user.username}</strong>
            <span className="dash-welcome-role">{user.role}</span>
            <span className="dash-welcome-unit">{getUnitName(user.unitId)}</span>
          </div>
        </div>
      </div>

      {/* ===== DATE RANGE FILTER BAR ===== */}
      <div className="dash-filter-bar">
        <div className="dash-filter-row">
          <div className="dash-presets">
            {[
              { key: 'all', label: 'All' },
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: '7days', label: 'Last 7 Days' },
              { key: '15days', label: 'Last 15 Days' },
              { key: '30days', label: 'Last 30 Days' },
              { key: 'this-month', label: 'This Month' },
              { key: 'custom', label: 'Custom' }
            ].map(p => (
              <button
                key={p.key}
                className={`dash-preset-btn ${activePreset === p.key ? 'active' : ''}`}
                onClick={() => applyPreset(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          {isAdmin && <div className="dash-unit-filter">
            <button
              className={`dash-unit-btn overall ${selectedUnit === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedUnit('all')}
            >
              Overall
            </button>
            {units.map(u => (
              <button
                key={u._id}
                className={`dash-unit-btn ${selectedUnit === u._id ? 'active' : ''}`}
                onClick={() => setSelectedUnit(u._id)}
              >
                {u.name}
              </button>
            ))}
          </div>}
        </div>
        {activePreset === 'custom' && (
          <div className="dash-custom-range">
            <label>Start Date
              <input type="date" value={dateRange.start}
                onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))} />
            </label>
            <label>End Date
              <input type="date" value={dateRange.end}
                onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))} />
            </label>
          </div>
        )}
        <div className="dash-range-display">
          {activePreset === 'all'
            ? <>Showing <strong>All Time</strong> data</>
            : <>Showing data from <strong>{new Date(dateRange.start).toLocaleDateString('en-IN')}</strong> to <strong>{new Date(dateRange.end).toLocaleDateString('en-IN')}</strong></>
          }
          {selectedUnit === 'all'
            ? <span> — <strong>Overall (All Units)</strong></span>
            : selectedUnit && <span> — <strong>{getUnitName(selectedUnit)}</strong></span>
          }
          {loading && <span className="dash-refreshing">Refreshing...</span>}
        </div>
      </div>

      {error && <div className="dash-error">⚠ {error}</div>}

      {/* ===== KPI CARDS ===== */}
      <section className="dash-section">
        <h3 className="dash-section-title">Key Performance Indicators</h3>
        <div className="kpi-grid">
          <KpiCard icon="📋" title="Reservations" value={formatNumber(kpi.totalReservations)} desc="In selected period" />
          <KpiCard icon="📄" title="Agreements" value={formatNumber(kpi.totalAgreements)} desc={`${formatNumber(kpi.agreementQuintals)} qtl · ${formatNumber(kpi.agreementBags)} bags`} />
          <KpiCard icon="🚚" title="Withdrawals" value={`${formatNumber(kpi.totalWithdrawalBags)} bags`} desc="Dispatched in period" />
          <KpiCard icon="📦" title="Remaining Bags" value={formatNumber(kpi.remainingBags)} desc="Current inventory (all-time)" />
          <KpiCard icon="💰" title="Payments Received" value={formatCurrency(kpi.totalPaymentsReceived)} desc="In selected period" color="green" />
          <KpiCard icon="💸" title="Total Expenses" value={formatCurrency(kpi.totalExpenses)} desc="In selected period" color="red" />
          <KpiCard icon="🏷️" title="Total Rebate" value={formatCurrency(kpi.totalRebate)} desc="Discounts given" color="amber" />
        </div>
      </section>

      {/* ===== INVENTORY OVERVIEW ===== */}
      <section className="dash-section">
        <h3 className="dash-section-title">Inventory Overview</h3>
        <div className="summary-grid cols-4">
          <SummaryCard label="Total Agreed Bags" value={formatNumber(inv.totalAgreedBags)} />
          <SummaryCard label="Total Withdrawn Bags" value={formatNumber(inv.totalWithdrawnBags)} />
          <SummaryCard label="Remaining Bags" value={formatNumber(inv.remainingBags)} highlight={inv.remainingBags < 0 ? 'negative' : ''} />
          <SummaryCard label="Utilization" value={inv.totalAgreedBags > 0 ? `${((inv.totalWithdrawnBags / inv.totalAgreedBags) * 100).toFixed(1)}%` : '0%'} />
        </div>
      </section>

      {/* ===== FINANCIAL SUMMARY ===== */}
      <section className="dash-section">
        <h3 className="dash-section-title">Financial Summary</h3>
        <div className="summary-grid cols-4">
          <SummaryCard label="Payments Received" value={formatCurrency(fin.totalPaymentsReceived)} />
          <SummaryCard label="Total Expenses" value={formatCurrency(fin.totalExpenses)} />
          <SummaryCard label="Transfer to Store" value={formatCurrency(fin.transferToStore)} />
          <SummaryCard label="Transfer to Owner" value={formatCurrency(fin.transferToOwner)} />
          <SummaryCard label="Amount Collected" value={formatCurrency(fin.amountCollected)} />
          <SummaryCard label="Profit / Loss" value={formatCurrency(fin.profitOrLoss)} highlight={fin.profitOrLoss < 0 ? 'negative' : 'positive'} />
          <SummaryCard label="Total Rebate" value={formatCurrency(fin.totalRebate)} />
        </div>
      </section>

      {/* ===== PALDARI SUMMARY ===== */}
      <section className="dash-section">
        <h3 className="dash-section-title">Paldari Summary</h3>
        <div className="summary-grid cols-3">
          <SummaryCard label="Total Paldari Amount" value={formatCurrency(pal.totalPaldariAmount)} />
          <SummaryCard label="Total Paldari Paid" value={formatCurrency(pal.totalPaldariPaid)} />
          <SummaryCard label="Total Paldari Due" value={formatCurrency(pal.totalPaldariDue)} highlight={pal.totalPaldariDue > 0 ? 'negative' : ''} />
        </div>
      </section>

      {/* ===== RESERVATION / AGREEMENT / WITHDRAWAL SUMMARY ===== */}
      <section className="dash-section">
        <h3 className="dash-section-title">Operational Summary</h3>
        <div className="ops-grid">
          <div className="ops-card">
            <div className="ops-icon">📋</div>
            <div className="ops-body">
              <h4>Reservations</h4>
              <div className="ops-row"><span>In Period</span><strong>{formatNumber(ops.reservationsInRange)}</strong></div>
              <div className="ops-row"><span>All Time</span><strong>{formatNumber(ops.totalReservations)}</strong></div>
            </div>
          </div>
          <div className="ops-card">
            <div className="ops-icon">📄</div>
            <div className="ops-body">
              <h4>Agreements</h4>
              <div className="ops-row"><span>In Period</span><strong>{formatNumber(ops.agreementsInRange)}</strong></div>
              <div className="ops-row"><span>All Time</span><strong>{formatNumber(ops.totalAgreements)}</strong></div>
            </div>
          </div>
          <div className="ops-card">
            <div className="ops-icon">🚚</div>
            <div className="ops-body">
              <h4>Withdrawals</h4>
              <div className="ops-row"><span>In Period</span><strong>{formatNumber(ops.withdrawalsInRange)}</strong></div>
              <div className="ops-row"><span>All Time</span><strong>{formatNumber(ops.totalWithdrawals)}</strong></div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== DUES REPORT ===== */}
      <section className="dash-section">
        <h3 className="dash-section-title">Dues Report</h3>
        <div className="summary-grid cols-3">
          <SummaryCard label="Total Agreement Amount" value={formatCurrency(dues.totalAgreementAmount)} />
          <SummaryCard label="Total Amount Collected" value={formatCurrency(dues.totalAmountCollected)} />
          <SummaryCard label="Total Amount Due" value={formatCurrency(dues.totalAmountDue)} highlight={dues.totalAmountDue > 0 ? 'negative' : ''} />
        </div>
      </section>

      {/* ===== CHARTS ===== */}
      <section className="dash-section">
        <h3 className="dash-section-title">Data Visualization</h3>
        <div className="charts-grid">

          {/* 1. Reservation Trend Line */}
          <div className="chart-card wide">
            <h4>Reservation Trend</h4>
            {(charts.reservationTrend || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={charts.reservationTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" name="Reservations" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="chart-empty">No reservation data in selected period</div>}
          </div>

          {/* 2. Agreement vs Withdrawal Bar */}
          <div className="chart-card wide">
            <h4>Agreement vs Withdrawal (by Date)</h4>
            {agrVsWdrData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={agrVsWdrData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="agreements" name="Agreements" fill="#4f46e5" radius={[4,4,0,0]} />
                  <Bar dataKey="withdrawals" name="Withdrawals" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="chart-empty">No data in selected period</div>}
          </div>

          {/* 3. Payments Pie Chart */}
          <div className="chart-card">
            <h4>Payments by Mode</h4>
            {paymentPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={paymentPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={renderPieLabel}>
                    {paymentPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={currencyFormatter} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="chart-empty">No payment data</div>}
          </div>

          {/* 4. Payments vs Expenses Pie */}
          <div className="chart-card">
            <h4>Payments vs Expenses</h4>
            {finPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={finPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={renderPieLabel}>
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip formatter={currencyFormatter} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="chart-empty">No financial data</div>}
            {(fin.profitOrLoss !== undefined) && (
              <div className={`chart-footer ${fin.profitOrLoss >= 0 ? 'positive' : 'negative'}`}>
                {fin.profitOrLoss >= 0 ? 'Profit' : 'Loss'}: {formatCurrency(Math.abs(fin.profitOrLoss))}
              </div>
            )}
          </div>

          {/* 5. Agreement Amount vs Rebate Pie */}
          <div className="chart-card">
            <h4>Agreement Amount vs Rebate</h4>
            {rebatePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={rebatePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={renderPieLabel}>
                    <Cell fill="#4f46e5" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip formatter={currencyFormatter} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="chart-empty">No data</div>}
          </div>

          {/* 6. Inventory Status Bar */}
          <div className="chart-card">
            <h4>Inventory Status</h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={invBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip />
                <Bar dataKey="bags" name="Bags" radius={[0,4,4,0]}>
                  <Cell fill="#4f46e5" />
                  <Cell fill="#ef4444" />
                  <Cell fill="#10b981" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      </section>
    </div>
  );
};

/* ===== SUBCOMPONENTS ===== */

const KpiCard = ({ icon, title, value, desc, color }) => (
  <div className={`kpi-card ${color || ''}`}>
    <div className="kpi-icon">{icon}</div>
    <div className="kpi-body">
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-desc">{desc}</div>
    </div>
  </div>
);

const SummaryCard = ({ label, value, highlight }) => (
  <div className={`summary-card ${highlight || ''}`}>
    <div className="summary-label">{label}</div>
    <div className="summary-value">{value}</div>
  </div>
);

export default Dashboard;
