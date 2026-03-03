import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Package, Clock, AlertTriangle, CheckCircle, XCircle, Calendar, Zap, Truck, ChevronLeft, ChevronRight, Filter, X, FileText, MapPin, User, Activity, History, Search, ArrowUpDown, Eye, Navigation, Phone, ChevronDown, ChevronUp, RefreshCw, Loader } from 'lucide-react';
import Papa from 'papaparse';

// ============================================================
// CONFIGURATION — UPDATE THESE VALUES
// ============================================================
// To get your Google Sheet URL:
// 1. Open your Google Sheet
// 2. Go to File → Share → Publish to web
// 3. Select the correct tab, choose "CSV" format, click Publish
// 4. Paste that URL below
//
// The URL should look like:
// https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/pub?gid=0&single=true&output=csv
// ============================================================
const GOOGLE_SHEET_CSV_URL = 'YOUR_GOOGLE_SHEET_CSV_URL_HERE';
const DASHBOARD_PASSWORD = 'droppoint2026'; // Change this to your preferred password
// ============================================================

// Zoom2u Brand Design System
const Z2U = {
  grey: '#4b5054',
  blue: '#00a7e2',
  melon: '#fd5373',
  green: '#76d750',
  yellow: '#ffd100',
  white: '#FFFFFF',
  grey50: '#F9FAFB',
  grey100: '#F3F4F6',
  grey200: '#E5E7EB',
  grey300: '#D1D5DB',
  grey400: '#9CA3AF',
  grey500: '#6B7280',
  chart: ['#00a7e2', '#4b5054', '#76d750', '#fd5373', '#ffd100', '#33b5e5']
};

// Convert distance_km (number) to distance category for charts
function getDistanceCategory(km) {
  const num = parseFloat(km);
  if (isNaN(num)) return 'Unknown';
  if (num <= 30) return '0-30km';
  if (num <= 50) return '30.01-50km';
  return '50.01+km';
}

// Calculate DIFOT using Droppoint rules:
// - 3 hour / Same day: on time if DropActual <= RequestedDropDateTime
// - VIP: on time if DropActual <= RequestedDropDateTime
//   OR if DropActual is within distance-based window from RequestedPickupDateTime:
//     0-30km = 90 mins, 30.01-50km = 120 mins, 50.01+km = 150 mins
function calculateDifot(speed, distanceKm, dropActual, requestedDrop, requestedPickup) {
  if (!dropActual) return { on_time: false, overdue_mins: 0 };
  
  const actual = new Date(dropActual);
  const deadline = new Date(requestedDrop);
  
  if (isNaN(actual.getTime()) || isNaN(deadline.getTime())) return { on_time: false, overdue_mins: 0 };

  // Check standard rule: delivered before requested drop time
  if (actual <= deadline) return { on_time: true, overdue_mins: 0 };

  // For VIP: also check distance-based window from requested pickup
  if (speed === 'VIP' && requestedPickup) {
    const pickup = new Date(requestedPickup);
    if (!isNaN(pickup.getTime())) {
      let allowedMins = 90; // 0-30km default
      if (distanceKm > 50) allowedMins = 150;
      else if (distanceKm > 30) allowedMins = 120;
      
      const vipDeadline = new Date(pickup.getTime() + allowedMins * 60 * 1000);
      if (actual <= vipDeadline) return { on_time: true, overdue_mins: 0 };
    }
  }

  // It's late — calculate overdue minutes from the requested drop time
  const overdue_mins = Math.round((actual - deadline) / (1000 * 60));
  return { on_time: false, overdue_mins: Math.max(0, overdue_mins) };
}

// Parse a row from the Google Sheet CSV into our booking object
function parseBookingRow(row) {
  const hour = parseInt(row.hour) || 0;
  const distance_km = parseFloat(row.distance_km) || 0;
  const speed = (row.speed || '').trim();
  const po = (row.po || '').trim();

  // Determine client group based on PO prefix
  const poUpper = po.toUpperCase();
  const client = (poUpper.startsWith('FBAU') || poUpper.startsWith('ANC')) ? 'Fuji' : 'Droppoint';

  // Calculate DIFOT from timestamps
  const { on_time, overdue_mins } = calculateDifot(
    speed,
    distance_km,
    (row.drop_actual || '').trim(),
    (row.requested_drop || '').trim(),
    (row.requested_pickup || '').trim()
  );

  return {
    booking_ref: (row.booking_ref || '').trim(),
    po,
    courier: (row.courier || '').trim(),
    pickup_address: (row.pickup_address || '').trim(),
    drop_address: (row.drop_address || '').trim(),
    date: (row.date || '').trim(),
    state: (row.state || '').trim(),
    speed,
    distance_km,
    distance: getDistanceCategory(distance_km),
    on_time,
    overdue_mins,
    hour,
    client,
    status: (row.status || 'delivered').trim(),
    drop_actual: (row.drop_actual || '').trim(),
    requested_drop: (row.requested_drop || '').trim(),
    requested_pickup: (row.requested_pickup || '').trim(),
    notes: []
  };
}

// Fetch and parse data from published Google Sheet
async function fetchSheetData() {
  const response = await fetch(GOOGLE_SHEET_CSV_URL);
  if (!response.ok) throw new Error(`Failed to fetch sheet: ${response.status}`);
  const csvText = await response.text();
  
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const bookings = results.data.map(parseBookingRow).filter(b => b.booking_ref && b.date);
        resolve(bookings);
      },
      error: (err) => reject(err)
    });
  });
}

// Helper functions
const formatHour = (h) => h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h-12}PM`;
const formatDateDisplay = (dateStr) => new Date(dateStr).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const getWeekStart = (date) => { const d = new Date(date); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split('T')[0]; };
const getWeekEnd = (date) => { const d = new Date(getWeekStart(date)); d.setDate(d.getDate() + 6); return d.toISOString().split('T')[0]; };
const getColorForDifot = (pct) => pct >= 75 ? Z2U.green : pct >= 60 ? Z2U.blue : Z2U.melon;

// Components
const Card = ({ children, style = {} }) => (
  <div style={{ background: Z2U.white, borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(75,80,84,0.08)', border: `1px solid ${Z2U.grey200}`, ...style }}>{children}</div>
);

const KPICard = ({ title, value, subtitle, icon: Icon, color, onClick }) => (
  <Card style={{ cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.15s' }} onClick={onClick}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <p style={{ color: Z2U.grey, fontSize: '12px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>{title}</p>
        <p style={{ color: Z2U.grey, fontSize: '36px', fontWeight: 700, margin: 0 }}>{value}</p>
        {subtitle && <p style={{ color: Z2U.grey400, fontSize: '13px', marginTop: '10px' }}>{subtitle}</p>}
      </div>
      <div style={{ background: `${color}18`, padding: '14px', borderRadius: '50%' }}>
        <Icon size={24} color={color} strokeWidth={2.5} />
      </div>
    </div>
  </Card>
);

const SectionHeader = ({ title, subtitle }) => (
  <div style={{ marginBottom: '16px' }}>
    <h2 style={{ color: Z2U.grey, fontSize: '18px', fontWeight: 700, margin: 0 }}>{title}</h2>
    {subtitle && <p style={{ color: Z2U.grey400, fontSize: '13px', marginTop: '4px' }}>{subtitle}</p>}
  </div>
);

const TabButton = ({ active, onClick, children, icon: Icon, badge }) => (
  <button onClick={onClick} style={{ background: active ? Z2U.blue : 'transparent', border: active ? 'none' : `1px solid ${Z2U.grey200}`, borderRadius: '24px', padding: '10px 18px', color: active ? Z2U.white : Z2U.grey, fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
    {Icon && <Icon size={16} />}{children}
    {badge && <span style={{ background: active ? Z2U.white : Z2U.melon, color: active ? Z2U.blue : Z2U.white, fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '10px', marginLeft: '2px' }}>{badge}</span>}
  </button>
);

const DateFilterButton = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{ background: active ? Z2U.grey : Z2U.white, border: `1px solid ${active ? Z2U.grey : Z2U.grey200}`, borderRadius: '20px', padding: '8px 14px', color: active ? Z2U.white : Z2U.grey, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{children}</button>
);

const ProgressBar = ({ value, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <div style={{ flex: 1, maxWidth: '80px', height: '8px', background: Z2U.grey100, borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: '4px' }} />
    </div>
    <span style={{ color, fontWeight: 700, fontSize: '14px', minWidth: '50px' }}>{value}%</span>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: Z2U.grey, borderRadius: '12px', padding: '12px 16px', boxShadow: '0 4px 12px rgba(75,80,84,0.2)' }}>
      <p style={{ color: Z2U.white, fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || Z2U.blue, fontSize: '12px', margin: '2px 0' }}>
          {entry.name}: {entry.dataKey?.includes('pct') ? `${entry.value}%` : entry.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

// Status badge helper
const StatusBadge = ({ status, isAtRisk }) => {
  const statusConfig = {
    'Awaiting pickup': { bg: `${Z2U.grey400}20`, color: Z2U.grey500, dot: Z2U.grey400 },
    'Picked up': { bg: `${Z2U.blue}15`, color: Z2U.blue, dot: Z2U.blue },
    'In transit': { bg: `${Z2U.blue}20`, color: Z2U.blue, dot: Z2U.blue },
    'Out for delivery': { bg: `${Z2U.green}18`, color: '#4da832', dot: Z2U.green },
    'Arriving soon': { bg: `${Z2U.green}25`, color: '#3d8a28', dot: Z2U.green },
    'Delivered': { bg: `${Z2U.green}18`, color: '#4da832', dot: Z2U.green },
    'Delivered late': { bg: `${Z2U.melon}15`, color: Z2U.melon, dot: Z2U.melon },
  };
  const cfg = statusConfig[status] || statusConfig['In transit'];
  const finalBg = isAtRisk ? `${Z2U.yellow}25` : cfg.bg;
  const finalColor = isAtRisk ? '#b8960a' : cfg.color;
  const finalDot = isAtRisk ? Z2U.yellow : cfg.dot;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: finalBg, color: finalColor, padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: finalDot, display: 'inline-block', animation: (status === 'In transit' || status === 'Arriving soon') ? 'pulse 2s infinite' : 'none' }} />
      {isAtRisk ? 'At risk' : status}
    </span>
  );
};

// Speed badge
const SpeedBadge = ({ speed, small }) => {
  const col = speed === 'VIP' ? Z2U.melon : speed === '3 hour' ? Z2U.blue : Z2U.green;
  return (
    <span style={{ background: col, color: Z2U.white, padding: small ? '2px 8px' : '4px 10px', borderRadius: '12px', fontSize: small ? '10px' : '11px', fontWeight: 700 }}>
      {speed}
    </span>
  );
};

// Delayed Bookings Popup Component
const DelayedBookingsPopup = ({ bookings, onClose, title }) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('overdue_mins');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedRef, setExpandedRef] = useState(null);
  
  const filtered = bookings.filter(b => 
    b.booking_ref.toLowerCase().includes(search.toLowerCase()) ||
    b.po.toLowerCase().includes(search.toLowerCase()) ||
    b.courier.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    const mult = sortDir === 'desc' ? -1 : 1;
    if (sortBy === 'overdue_mins') return mult * (a.overdue_mins - b.overdue_mins);
    if (sortBy === 'date') return mult * a.date.localeCompare(b.date);
    if (sortBy === 'booking_ref') return mult * a.booking_ref.localeCompare(b.booking_ref);
    return 0;
  });

  const getDelayCategory = (mins) => {
    if (mins <= 15) return { label: '1-15m', color: Z2U.blue };
    if (mins <= 30) return { label: '16-30m', color: Z2U.blue };
    if (mins <= 60) return { label: '31-60m', color: Z2U.yellow };
    if (mins <= 120) return { label: '1-2hr', color: Z2U.melon };
    return { label: '2hr+', color: Z2U.melon };
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: Z2U.white, borderRadius: '20px', width: '90%', maxWidth: '1000px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${Z2U.grey200}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: Z2U.grey, fontSize: '20px', fontWeight: 700, margin: 0 }}>{title || 'Delayed Bookings'}</h2>
            <p style={{ color: Z2U.grey400, fontSize: '13px', margin: '4px 0 0' }}>{filtered.length} bookings found</p>
          </div>
          <button onClick={onClose} style={{ background: Z2U.grey100, border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} color={Z2U.grey} />
          </button>
        </div>
        
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${Z2U.grey100}`, display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input type="text" placeholder="Search by reference, PO, or courier..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, padding: '10px 16px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', fontSize: '14px', outline: 'none' }} />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '10px 16px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', fontSize: '14px', background: Z2U.white }}>
            <option value="overdue_mins">Sort by Delay</option>
            <option value="date">Sort by Date</option>
            <option value="booking_ref">Sort by Reference</option>
          </select>
          <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')} style={{ padding: '10px 16px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', background: Z2U.white, cursor: 'pointer', fontSize: '14px' }}>
            {sortDir === 'desc' ? '↓ Desc' : '↑ Asc'}
          </button>
        </div>
        
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: Z2U.grey400 }}>
              <Package size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p>No bookings found</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filtered.slice(0, 100).map(booking => {
                const delay = getDelayCategory(booking.overdue_mins);
                const isExpanded = expandedRef === booking.booking_ref;
                return (
                  <div key={booking.booking_ref} style={{ border: `1px solid ${Z2U.grey200}`, borderRadius: '12px', overflow: 'hidden' }}>
                    <div onClick={() => setExpandedRef(isExpanded ? null : booking.booking_ref)} style={{ padding: '16px', cursor: 'pointer', background: isExpanded ? Z2U.grey50 : Z2U.white, display: 'grid', gridTemplateColumns: '1fr 120px 100px 80px 100px', gap: '16px', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ color: Z2U.blue, fontWeight: 700, fontSize: '14px' }}>{booking.booking_ref}</span>
                        </div>
                        <span style={{ color: Z2U.grey400, fontSize: '12px' }}>PO: {booking.po}</span>
                      </div>
                      <div>
                        <span style={{ color: Z2U.grey, fontSize: '13px' }}>{formatDateDisplay(booking.date).split(',')[0]}</span><br />
                        <span style={{ color: Z2U.grey400, fontSize: '12px' }}>{booking.date}</span>
                      </div>
                      <div><SpeedBadge speed={booking.speed} /></div>
                      <span style={{ color: Z2U.grey, fontSize: '13px' }}>{booking.state}</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ background: delay.color, color: Z2U.white, padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>+{booking.overdue_mins}m</span>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div style={{ padding: '0 16px 16px', background: Z2U.grey50, borderTop: `1px solid ${Z2U.grey200}` }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '16px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                              <User size={14} color={Z2U.grey400} /><span style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase' }}>Courier</span>
                            </div>
                            <span style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600 }}>{booking.courier}</span>
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                              <MapPin size={14} color={Z2U.grey400} /><span style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase' }}>Distance</span>
                            </div>
                            <span style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600 }}>{booking.distance_km}km ({booking.distance})</span>
                          </div>
                        </div>
                        <div style={{ marginTop: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <MapPin size={14} color={Z2U.grey400} /><span style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase' }}>Drop address</span>
                          </div>
                          <span style={{ color: Z2U.grey, fontSize: '13px' }}>{booking.drop_address}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filtered.length > 100 && <p style={{ textAlign: 'center', color: Z2U.grey400, fontSize: '13px', padding: '16px' }}>Showing first 100 of {filtered.length} results</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// Loading spinner component
const LoadingScreen = () => (
  <div style={{ minHeight: '100vh', background: Z2U.grey50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif" }}>
    <div style={{ background: Z2U.grey, padding: '18px', borderRadius: '50%', marginBottom: '24px' }}>
      <Truck size={36} color={Z2U.blue} strokeWidth={2.5} />
    </div>
    <h2 style={{ color: Z2U.grey, fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>Loading dashboard data...</h2>
    <p style={{ color: Z2U.grey400, fontSize: '14px', margin: 0 }}>Fetching from Google Sheets</p>
    <div style={{ marginTop: '24px' }}>
      <Loader size={28} color={Z2U.blue} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  </div>
);

// Error screen component
const ErrorScreen = ({ error, onRetry }) => (
  <div style={{ minHeight: '100vh', background: Z2U.grey50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif", padding: '24px' }}>
    <div style={{ background: `${Z2U.melon}18`, padding: '18px', borderRadius: '50%', marginBottom: '24px' }}>
      <AlertTriangle size={36} color={Z2U.melon} strokeWidth={2.5} />
    </div>
    <h2 style={{ color: Z2U.grey, fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>Failed to load data</h2>
    <p style={{ color: Z2U.grey400, fontSize: '14px', margin: '0 0 8px', textAlign: 'center', maxWidth: '500px' }}>{error}</p>
    <p style={{ color: Z2U.grey400, fontSize: '13px', margin: '0 0 24px', textAlign: 'center', maxWidth: '500px' }}>
      Check that your Google Sheet is published to web (File → Share → Publish to web → CSV) and the URL is correct in the code.
    </p>
    <button onClick={onRetry} style={{ background: Z2U.blue, color: Z2U.white, border: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <RefreshCw size={16} /> Try Again
    </button>
  </div>
);


export default function Dashboard() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('dashboard_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === DASHBOARD_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('dashboard_auth', 'true');
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: Z2U.grey50, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');`}</style>
        <div style={{ background: Z2U.white, borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(75,80,84,0.12)', border: `1px solid ${Z2U.grey200}` }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ background: Z2U.grey, padding: '14px', borderRadius: '50%', display: 'inline-flex', marginBottom: '16px' }}>
              <Truck size={28} color={Z2U.blue} strokeWidth={2.5} />
            </div>
            <h1 style={{ color: Z2U.grey, fontSize: '22px', fontWeight: 800, margin: '0 0 4px' }}>Droppoint Performance</h1>
            <p style={{ color: Z2U.grey400, fontSize: '14px', margin: 0 }}>Enter password to access the dashboard</p>
          </div>
          <div>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setAuthError(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin(e)}
              placeholder="Password"
              autoFocus
              style={{
                width: '100%', padding: '14px 16px', border: `2px solid ${authError ? Z2U.melon : Z2U.grey200}`,
                borderRadius: '12px', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                marginBottom: '12px', transition: 'border-color 0.2s'
              }}
            />
            {authError && <p style={{ color: Z2U.melon, fontSize: '13px', margin: '0 0 12px', fontWeight: 600 }}>Incorrect password</p>}
            <button
              onClick={handleLogin}
              style={{
                width: '100%', padding: '14px', background: Z2U.blue, color: Z2U.white,
                border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Data loading state
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [dateFilter, setDateFilter] = useState('month');
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today's date
    return new Date().toISOString().split('T')[0];
  });
  const [popup, setPopup] = useState(null);
  
  // Client filter state
  const [clientFilter, setClientFilter] = useState('all');
  
  // History tab state
  const [historySearch, setHistorySearch] = useState('');
  const [historySort, setHistorySort] = useState('date');
  const [historySortDir, setHistorySortDir] = useState('desc');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historySpeedFilter, setHistorySpeedFilter] = useState('all');
  const [historyStateFilter, setHistoryStateFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [expandedHistoryRef, setExpandedHistoryRef] = useState(null);
  const historyPerPage = 25;

  // Load data from Google Sheets on mount
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (GOOGLE_SHEET_CSV_URL === 'YOUR_GOOGLE_SHEET_CSV_URL_HERE') {
        throw new Error('Google Sheet URL not configured. Open src/dashboard.jsx and replace YOUR_GOOGLE_SHEET_CSV_URL_HERE with your published Google Sheet CSV URL.');
      }
      const bookings = await fetchSheetData();
      if (bookings.length === 0) {
        throw new Error('No booking data found in the sheet. Check that the sheet has data and column headers match: booking_ref, po, courier, pickup_address, drop_address, date, state, speed, distance_km, on_time, overdue_mins, hour, status');
      }
      setAllBookings(bookings);
      
      // Auto-set the selected date to the most recent date in the data
      const dates = bookings.map(b => b.date).filter(Boolean).sort();
      if (dates.length > 0) {
        setSelectedDate(dates[dates.length - 1]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Separate delivered vs active bookings based on status
  const deliveredBookings = useMemo(() => 
    allBookings.filter(b => b.status.toLowerCase() === 'delivered' || b.status.toLowerCase() === 'delivered late' || b.on_time !== undefined),
    [allBookings]
  );

  const activeBookingsData = useMemo(() =>
    allBookings.filter(b => {
      const s = b.status.toLowerCase();
      return s !== 'delivered' && s !== 'delivered late' && s !== '' && s !== 'cancelled';
    }),
    [allBookings]
  );

  const filteredData = useMemo(() => {
    let startDate, endDate;
    const selected = new Date(selectedDate);
    switch (dateFilter) {
      case 'day': startDate = endDate = selectedDate; break;
      case 'week': startDate = getWeekStart(selectedDate); endDate = getWeekEnd(selectedDate); break;
      case 'month': startDate = `${selectedDate.slice(0,7)}-01`; endDate = new Date(selected.getFullYear(), selected.getMonth()+1, 0).toISOString().split('T')[0]; break;
      case 'year': startDate = `${selected.getFullYear()}-01-01`; endDate = `${selected.getFullYear()}-12-31`; break;
      default: startDate = endDate = selectedDate;
    }
    return deliveredBookings.filter(b => {
      const inDateRange = b.date >= startDate && b.date <= endDate;
      const matchesClient = clientFilter === 'all' || b.client === clientFilter;
      return inDateRange && matchesClient;
    });
  }, [dateFilter, selectedDate, deliveredBookings, clientFilter]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    const onTime = filteredData.filter(b => b.on_time).length;
    const late = total - onTime;
    const difot = total > 0 ? ((onTime / total) * 100).toFixed(1) : 0;
    const lateBookings = filteredData.filter(b => !b.on_time);

    const stateMap = {};
    filteredData.forEach(b => {
      if (!stateMap[b.state]) stateMap[b.state] = { total: 0, onTime: 0, lateBookings: [] };
      stateMap[b.state].total++;
      if (b.on_time) stateMap[b.state].onTime++;
      else stateMap[b.state].lateBookings.push(b);
    });
    const stateData = Object.entries(stateMap).map(([state, data]) => ({
      State: state, total: data.total, on_time_count: data.onTime, late_count: data.total - data.onTime,
      difot_pct: parseFloat(((data.onTime / data.total) * 100).toFixed(1)),
      lateBookings: data.lateBookings
    })).sort((a, b) => b.difot_pct - a.difot_pct);

    const speedMap = {};
    filteredData.forEach(b => {
      if (!speedMap[b.speed]) speedMap[b.speed] = { total: 0, onTime: 0, lateBookings: [] };
      speedMap[b.speed].total++;
      if (b.on_time) speedMap[b.speed].onTime++;
      else speedMap[b.speed].lateBookings.push(b);
    });
    const speedData = Object.entries(speedMap).map(([speed, data]) => ({
      DeliverySpeed: speed, total: data.total, on_time_count: data.onTime,
      difot_pct: parseFloat(((data.onTime / data.total) * 100).toFixed(1)),
      lateBookings: data.lateBookings
    }));

    const hourMap = {};
    filteredData.forEach(b => {
      if (!hourMap[b.hour]) hourMap[b.hour] = { total: 0, onTime: 0 };
      hourMap[b.hour].total++;
      if (b.on_time) hourMap[b.hour].onTime++;
    });
    const hourData = Object.entries(hourMap).map(([hour, data]) => ({
      booking_hour: parseInt(hour), hour_label: formatHour(parseInt(hour)),
      total: data.total, on_time_count: data.onTime,
      difot_pct: parseFloat(((data.onTime / data.total) * 100).toFixed(1))
    })).sort((a, b) => a.booking_hour - b.booking_hour);

    const distMap = {};
    filteredData.forEach(b => {
      if (!distMap[b.distance]) distMap[b.distance] = { total: 0, onTime: 0, lateBookings: [] };
      distMap[b.distance].total++;
      if (b.on_time) distMap[b.distance].onTime++;
      else distMap[b.distance].lateBookings.push(b);
    });
    const distanceData = Object.entries(distMap).map(([dist, data]) => ({
      distance_category: dist, total: data.total, on_time_count: data.onTime,
      difot_pct: parseFloat(((data.onTime / data.total) * 100).toFixed(1)),
      lateBookings: data.lateBookings
    }));

    const dayMap = { Monday: { total: 0, onTime: 0 }, Tuesday: { total: 0, onTime: 0 }, Wednesday: { total: 0, onTime: 0 }, Thursday: { total: 0, onTime: 0 }, Friday: { total: 0, onTime: 0 }, Saturday: { total: 0, onTime: 0 }, Sunday: { total: 0, onTime: 0 } };
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    filteredData.forEach(b => {
      const day = dayNames[new Date(b.date).getDay()];
      dayMap[day].total++;
      if (b.on_time) dayMap[day].onTime++;
    });
    const dayData = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => ({
      booking_day_of_week: day, day_short: day.slice(0, 3),
      total: dayMap[day].total, on_time_count: dayMap[day].onTime,
      difot_pct: dayMap[day].total > 0 ? parseFloat(((dayMap[day].onTime / dayMap[day].total) * 100).toFixed(1)) : 0
    }));

    const overdueData = {
      '1-15 mins': lateBookings.filter(b => b.overdue_mins >= 1 && b.overdue_mins <= 15),
      '16-30 mins': lateBookings.filter(b => b.overdue_mins >= 16 && b.overdue_mins <= 30),
      '31-60 mins': lateBookings.filter(b => b.overdue_mins >= 31 && b.overdue_mins <= 60),
      '1-2 hours': lateBookings.filter(b => b.overdue_mins >= 61 && b.overdue_mins <= 120),
      '2+ hours': lateBookings.filter(b => b.overdue_mins > 120)
    };

    const delaysByDistance = ['0-30km', '30.01-50km', '50.01+km'].map(dist => {
      const distLate = lateBookings.filter(b => b.distance === dist);
      return {
        distance: dist, total_late: distLate.length, lateBookings: distLate,
        minor: distLate.filter(b => b.overdue_mins <= 30).length,
        moderate: distLate.filter(b => b.overdue_mins > 30 && b.overdue_mins <= 60).length,
        critical: distLate.filter(b => b.overdue_mins > 60).length,
        avg_overdue: distLate.length > 0 ? Math.round(distLate.reduce((s, b) => s + b.overdue_mins, 0) / distLate.length) : 0
      };
    });

    return { total, onTime, late, difot, stateData, speedData, hourData, distanceData, dayData, overdueData, delaysByDistance, lateBookings };
  }, [filteredData]);

  // Filtered & paginated delivery history
  const historyData = useMemo(() => {
    let data = [...filteredData];
    
    if (historySearch) {
      const q = historySearch.toLowerCase();
      data = data.filter(b => b.booking_ref.toLowerCase().includes(q) || b.po.toLowerCase().includes(q) || b.courier.toLowerCase().includes(q) || b.drop_address.toLowerCase().includes(q));
    }
    if (historyStatusFilter === 'on_time') data = data.filter(b => b.on_time);
    if (historyStatusFilter === 'late') data = data.filter(b => !b.on_time);
    if (historySpeedFilter !== 'all') data = data.filter(b => b.speed === historySpeedFilter);
    if (historyStateFilter !== 'all') data = data.filter(b => b.state === historyStateFilter);

    data.sort((a, b) => {
      const mult = historySortDir === 'desc' ? -1 : 1;
      if (historySort === 'date') return mult * a.date.localeCompare(b.date);
      if (historySort === 'ref') return mult * a.booking_ref.localeCompare(b.booking_ref);
      if (historySort === 'overdue') return mult * (a.overdue_mins - b.overdue_mins);
      if (historySort === 'state') return mult * a.state.localeCompare(b.state);
      return 0;
    });

    const totalPages = Math.ceil(data.length / historyPerPage);
    const paged = data.slice((historyPage - 1) * historyPerPage, historyPage * historyPerPage);
    return { all: data, paged, totalPages, totalCount: data.length };
  }, [filteredData, historySearch, historySort, historySortDir, historyStatusFilter, historySpeedFilter, historyStateFilter, historyPage]);

  const navigateDate = (dir) => {
    const c = new Date(selectedDate);
    switch (dateFilter) {
      case 'day': c.setDate(c.getDate() + dir); break;
      case 'week': c.setDate(c.getDate() + dir * 7); break;
      case 'month': c.setMonth(c.getMonth() + dir); break;
      case 'year': c.setFullYear(c.getFullYear() + dir); break;
    }
    setSelectedDate(c.toISOString().split('T')[0]);
  };

  const getPeriodLabel = () => {
    const d = new Date(selectedDate);
    switch (dateFilter) {
      case 'day': return formatDateDisplay(selectedDate);
      case 'week': return `${formatDateDisplay(getWeekStart(selectedDate)).split(' ').slice(0,3).join(' ')} - ${formatDateDisplay(getWeekEnd(selectedDate)).split(' ').slice(0,3).join(' ')}`;
      case 'month': return d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
      case 'year': return d.getFullYear().toString();
      default: return '';
    }
  };

  const pieData = [{ name: 'On Time', value: stats.onTime, fill: Z2U.green }, { name: 'Late', value: stats.late, fill: Z2U.melon }];
  const overdueChartData = Object.entries(stats.overdueData).map(([name, arr]) => ({ name, value: arr.length, bookings: arr }));

  const uniqueStates = [...new Set(filteredData.map(b => b.state))].sort();

  // Show loading or error screens
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} onRetry={loadData} />;

  return (
    <div style={{ minHeight: '100vh', background: Z2U.grey50, padding: '24px 32px', fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus, select:focus { border-color: ${Z2U.blue} !important; box-shadow: 0 0 0 3px ${Z2U.blue}20 !important; }
      `}</style>
      
      {popup && <DelayedBookingsPopup bookings={popup.bookings} title={popup.title} onClose={() => setPopup(null)} />}
      
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: Z2U.grey, padding: '14px', borderRadius: '50%' }}>
            <Truck size={28} color={Z2U.blue} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ color: Z2U.grey, fontSize: '28px', fontWeight: 800, margin: 0 }}>Droppoint Performance</h1>
            <p style={{ color: Z2U.grey400, fontSize: '14px', margin: '4px 0 0' }}>DIFOT Analytics Dashboard — {allBookings.length.toLocaleString()} bookings loaded{clientFilter !== 'all' ? ` (viewing ${clientFilter})` : ''}</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: Z2U.white, padding: '10px 16px', borderRadius: '28px', border: `1px solid ${Z2U.grey200}` }}>
          <Filter size={16} color={Z2U.grey400} />
          <div style={{ display: 'flex', gap: '6px' }}>
            {['day', 'week', 'month', 'year'].map(f => (
              <DateFilterButton key={f} active={dateFilter === f} onClick={() => setDateFilter(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}</DateFilterButton>
            ))}
          </div>
          <div style={{ marginLeft: '8px', paddingLeft: '12px', borderLeft: `1px solid ${Z2U.grey200}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => navigateDate(-1)} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}><ChevronLeft size={18} color={Z2U.grey400} /></button>
            <span style={{ color: Z2U.grey, fontWeight: 700, fontSize: '13px', minWidth: '160px', textAlign: 'center' }}>{getPeriodLabel()}</span>
            <button onClick={() => navigateDate(1)} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}><ChevronRight size={18} color={Z2U.grey400} /></button>
          </div>
        </div>
      </div>

      {/* Client Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
        <span style={{ color: Z2U.grey400, fontSize: '13px', fontWeight: 600, marginRight: '4px' }}>Client:</span>
        {['all', 'Droppoint', 'Fuji'].map(c => (
          <button key={c} onClick={() => setClientFilter(c)} style={{
            background: clientFilter === c ? (c === 'Fuji' ? Z2U.melon : c === 'Droppoint' ? Z2U.blue : Z2U.grey) : Z2U.white,
            border: clientFilter === c ? 'none' : `1px solid ${Z2U.grey200}`,
            borderRadius: '20px', padding: '8px 16px',
            color: clientFilter === c ? Z2U.white : Z2U.grey,
            fontSize: '13px', fontWeight: 700, cursor: 'pointer'
          }}>
            {c === 'all' ? 'All Clients' : c}
            {c !== 'all' && (
              <span style={{
                background: clientFilter === c ? 'rgba(255,255,255,0.25)' : Z2U.grey100,
                padding: '2px 7px', borderRadius: '10px', marginLeft: '6px', fontSize: '11px'
              }}>
                {deliveredBookings.filter(b => b.client === c).length.toLocaleString()}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { id: 'overview', label: 'Overview', icon: Package },
          { id: 'history', label: 'Delivery history', icon: History },
          { id: 'speed', label: 'By Speed', icon: Zap },
          { id: 'time', label: 'Time Analysis', icon: Calendar },
          { id: 'delays', label: 'Delays', icon: AlertTriangle }
        ].map(tab => (
          <TabButton key={tab.id} active={activeTab === tab.id} onClick={() => { setActiveTab(tab.id); setHistoryPage(1); }} icon={tab.icon}>{tab.label}</TabButton>
        ))}
      </div>

      {/* ===== DELIVERY HISTORY TAB ===== */}
      {activeTab === 'history' && (
        <>
          {/* History Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <KPICard title="Total deliveries" value={filteredData.length.toLocaleString()} subtitle={getPeriodLabel()} icon={Package} color={Z2U.grey} />
            <KPICard title="On time" value={filteredData.filter(b => b.on_time).length.toLocaleString()} subtitle={`${filteredData.length > 0 ? ((filteredData.filter(b => b.on_time).length / filteredData.length) * 100).toFixed(1) : 0}% of total`} icon={CheckCircle} color={Z2U.green} />
            <KPICard title="Late" value={filteredData.filter(b => !b.on_time).length.toLocaleString()} subtitle="Click delays tab for breakdown" icon={XCircle} color={Z2U.melon} />
            <KPICard title="Avg delay" value={`${filteredData.filter(b => !b.on_time).length > 0 ? Math.round(filteredData.filter(b => !b.on_time).reduce((s, b) => s + b.overdue_mins, 0) / filteredData.filter(b => !b.on_time).length) : 0}m`} subtitle="Across late deliveries" icon={Clock} color={Z2U.yellow} />
          </div>

          {/* Search & Filters */}
          <Card style={{ marginBottom: '16px', padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <Search size={16} color={Z2U.grey400} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input type="text" placeholder="Search reference, PO, courier, or address..." value={historySearch} onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }} style={{ width: '100%', padding: '10px 16px 10px 40px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <select value={historyStatusFilter} onChange={(e) => { setHistoryStatusFilter(e.target.value); setHistoryPage(1); }} style={{ padding: '10px 14px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', fontSize: '13px', background: Z2U.white, fontWeight: 600, color: Z2U.grey }}>
                <option value="all">All statuses</option>
                <option value="on_time">On time</option>
                <option value="late">Late</option>
              </select>
              <select value={historySpeedFilter} onChange={(e) => { setHistorySpeedFilter(e.target.value); setHistoryPage(1); }} style={{ padding: '10px 14px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', fontSize: '13px', background: Z2U.white, fontWeight: 600, color: Z2U.grey }}>
                <option value="all">All speeds</option>
                <option value="VIP">VIP</option>
                <option value="3 hour">3 hour</option>
                <option value="Same day">Same day</option>
              </select>
              <select value={historyStateFilter} onChange={(e) => { setHistoryStateFilter(e.target.value); setHistoryPage(1); }} style={{ padding: '10px 14px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', fontSize: '13px', background: Z2U.white, fontWeight: 600, color: Z2U.grey }}>
                <option value="all">All states</option>
                {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={historySort} onChange={(e) => setHistorySort(e.target.value)} style={{ padding: '10px 14px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', fontSize: '13px', background: Z2U.white, fontWeight: 600, color: Z2U.grey }}>
                <option value="date">Sort by date</option>
                <option value="ref">Sort by reference</option>
                <option value="overdue">Sort by delay</option>
                <option value="state">Sort by state</option>
              </select>
              <button onClick={() => setHistorySortDir(d => d === 'desc' ? 'asc' : 'desc')} style={{ padding: '10px 14px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', background: Z2U.white, cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: Z2U.grey, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ArrowUpDown size={14} /> {historySortDir === 'desc' ? 'Desc' : 'Asc'}
              </button>
            </div>
            <p style={{ color: Z2U.grey400, fontSize: '12px', margin: '12px 0 0' }}>{historyData.totalCount.toLocaleString()} results — page {historyPage} of {historyData.totalPages || 1}</p>
          </Card>

          {/* History Table */}
          <Card style={{ padding: '0', overflow: 'hidden' }}>
            {historyData.paged.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px' }}>
                <Search size={48} color={Z2U.grey300} style={{ marginBottom: '12px' }} />
                <p style={{ color: Z2U.grey, fontWeight: 700, margin: '0 0 4px' }}>No deliveries match your filters</p>
                <p style={{ color: Z2U.grey400, fontSize: '13px', margin: 0 }}>Try adjusting your search or filters</p>
              </div>
            ) : (
              <div>
                {/* Table Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.9fr 0.7fr 0.6fr 0.6fr 0.7fr 40px', gap: '12px', padding: '14px 20px', borderBottom: `2px solid ${Z2U.grey200}`, background: Z2U.grey50 }}>
                  {['Reference', 'Date', 'Speed', 'State', 'Status', 'Delay', ''].map(h => (
                    <span key={h} style={{ color: Z2U.grey400, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>
                
                {/* Rows */}
                {historyData.paged.map(booking => {
                  const isExpanded = expandedHistoryRef === booking.booking_ref;
                  return (
                    <div key={booking.booking_ref} style={{ borderBottom: `1px solid ${Z2U.grey100}` }}>
                      <div onClick={() => setExpandedHistoryRef(isExpanded ? null : booking.booking_ref)} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.9fr 0.7fr 0.6fr 0.6fr 0.7fr 40px', gap: '12px', padding: '14px 20px', cursor: 'pointer', background: isExpanded ? Z2U.grey50 : Z2U.white, alignItems: 'center', transition: 'background 0.1s' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: Z2U.blue, fontWeight: 700, fontSize: '13px' }}>{booking.booking_ref}</span>
                            <span style={{ background: booking.client === 'Fuji' ? `${Z2U.melon}18` : `${Z2U.blue}15`, color: booking.client === 'Fuji' ? Z2U.melon : Z2U.blue, padding: '1px 7px', borderRadius: '8px', fontSize: '9px', fontWeight: 800 }}>{booking.client}</span>
                          </div>
                          <span style={{ color: Z2U.grey400, fontSize: '11px' }}>PO: {booking.po}</span>
                        </div>
                        <span style={{ color: Z2U.grey, fontSize: '13px' }}>{booking.date}</span>
                        <SpeedBadge speed={booking.speed} small />
                        <span style={{ color: Z2U.grey, fontSize: '13px', fontWeight: 600 }}>{booking.state}</span>
                        <div>
                          {booking.on_time ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4da832', fontSize: '12px', fontWeight: 700 }}>
                              <CheckCircle size={14} /> On time
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: Z2U.melon, fontSize: '12px', fontWeight: 700 }}>
                              <XCircle size={14} /> Late
                            </span>
                          )}
                        </div>
                        <div>
                          {!booking.on_time && (
                            <span style={{ background: booking.overdue_mins > 60 ? Z2U.melon : booking.overdue_mins > 30 ? Z2U.yellow : Z2U.blue, color: Z2U.white, padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>+{booking.overdue_mins}m</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isExpanded ? <ChevronUp size={16} color={Z2U.grey400} /> : <ChevronDown size={16} color={Z2U.grey400} />}
                        </div>
                      </div>
                      
                      {/* Expanded Row */}
                      {isExpanded && (
                        <div style={{ padding: '16px 20px', background: Z2U.grey50, borderTop: `1px solid ${Z2U.grey200}` }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                            <div>
                              <p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Courier</p>
                              <p style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600, margin: 0 }}>{booking.courier}</p>
                            </div>
                            <div>
                              <p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Distance</p>
                              <p style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600, margin: 0 }}>{booking.distance_km}km</p>
                            </div>
                            <div>
                              <p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Booked at</p>
                              <p style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600, margin: 0 }}>{formatHour(booking.hour)}</p>
                            </div>
                          </div>
                          <div>
                            <p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Drop-off address</p>
                            <p style={{ color: Z2U.grey, fontSize: '13px', margin: 0 }}>{booking.drop_address}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Pagination */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: Z2U.grey50 }}>
                  <span style={{ color: Z2U.grey400, fontSize: '13px' }}>
                    Showing {((historyPage - 1) * historyPerPage) + 1}–{Math.min(historyPage * historyPerPage, historyData.totalCount)} of {historyData.totalCount.toLocaleString()}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button disabled={historyPage <= 1} onClick={() => setHistoryPage(p => p - 1)} style={{ padding: '8px 14px', border: `1px solid ${Z2U.grey200}`, borderRadius: '8px', background: Z2U.white, cursor: historyPage <= 1 ? 'not-allowed' : 'pointer', opacity: historyPage <= 1 ? 0.4 : 1, fontSize: '13px', fontWeight: 600, color: Z2U.grey, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ChevronLeft size={14} /> Previous
                    </button>
                    {Array.from({ length: Math.min(5, historyData.totalPages) }, (_, i) => {
                      let page;
                      if (historyData.totalPages <= 5) page = i + 1;
                      else if (historyPage <= 3) page = i + 1;
                      else if (historyPage >= historyData.totalPages - 2) page = historyData.totalPages - 4 + i;
                      else page = historyPage - 2 + i;
                      return (
                        <button key={page} onClick={() => setHistoryPage(page)} style={{ padding: '8px 12px', border: page === historyPage ? 'none' : `1px solid ${Z2U.grey200}`, borderRadius: '8px', background: page === historyPage ? Z2U.blue : Z2U.white, color: page === historyPage ? Z2U.white : Z2U.grey, cursor: 'pointer', fontSize: '13px', fontWeight: 700, minWidth: '38px' }}>
                          {page}
                        </button>
                      );
                    })}
                    <button disabled={historyPage >= historyData.totalPages} onClick={() => setHistoryPage(p => p + 1)} style={{ padding: '8px 14px', border: `1px solid ${Z2U.grey200}`, borderRadius: '8px', background: Z2U.white, cursor: historyPage >= historyData.totalPages ? 'not-allowed' : 'pointer', opacity: historyPage >= historyData.totalPages ? 0.4 : 1, fontSize: '13px', fontWeight: 600, color: Z2U.grey, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ===== EXISTING TABS ===== */}
      {stats.total === 0 && activeTab !== 'history' ? (
        <Card style={{ textAlign: 'center', padding: '60px' }}>
          <Package size={48} color={Z2U.grey300} style={{ marginBottom: '16px' }} />
          <h3 style={{ color: Z2U.grey, margin: '0 0 8px' }}>No data for this period</h3>
          <p style={{ color: Z2U.grey400, margin: 0 }}>Try selecting a different date range</p>
        </Card>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <KPICard title="Total Bookings" value={stats.total.toLocaleString()} subtitle="In selected period" icon={Package} color={Z2U.grey} />
                <KPICard title="Overall DIFOT" value={`${stats.difot}%`} subtitle="Delivered In Full On Time" icon={Clock} color={Z2U.blue} />
                <KPICard title="On Time" value={stats.onTime.toLocaleString()} subtitle={`${((stats.onTime / stats.total) * 100).toFixed(1)}% success`} icon={CheckCircle} color={Z2U.green} />
                <KPICard title="Late Deliveries" value={stats.late.toLocaleString()} subtitle="Click to view details →" icon={XCircle} color={Z2U.melon} onClick={() => setPopup({ bookings: stats.lateBookings, title: 'All Late Deliveries' })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <Card>
                  <SectionHeader title="DIFOT by State" subtitle="Click bar to view delayed bookings" />
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.stateData} layout="vertical" onClick={(e) => e?.activePayload && setPopup({ bookings: e.activePayload[0].payload.lateBookings, title: `Late Deliveries - ${e.activePayload[0].payload.State}` })}>
                      <CartesianGrid strokeDasharray="3 3" stroke={Z2U.grey200} />
                      <XAxis type="number" domain={[0, 100]} stroke={Z2U.grey300} fontSize={11} tickFormatter={v => `${v}%`} />
                      <YAxis dataKey="State" type="category" stroke={Z2U.grey300} fontSize={12} width={45} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="difot_pct" name="DIFOT %" radius={[0, 8, 8, 0]} cursor="pointer">
                        {stats.stateData.map((entry, i) => <Cell key={i} fill={getColorForDifot(entry.difot_pct)} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                <Card>
                  <SectionHeader title="Delivery Status" />
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="45%" innerRadius={65} outerRadius={95} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <Card>
                <SectionHeader title="State Performance Details" subtitle="Click late count to view bookings" />
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${Z2U.grey200}` }}>
                      {['State', 'Total', 'On Time', 'Late', 'DIFOT'].map(h => (
                        <th key={h} style={{ padding: '12px', textAlign: 'left', color: Z2U.grey400, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.stateData.map(row => (
                      <tr key={row.State} style={{ borderBottom: `1px solid ${Z2U.grey100}` }}>
                        <td style={{ padding: '14px 12px', color: Z2U.grey, fontWeight: 700 }}>{row.State}</td>
                        <td style={{ padding: '14px 12px', color: Z2U.grey500 }}>{row.total.toLocaleString()}</td>
                        <td style={{ padding: '14px 12px', color: Z2U.green, fontWeight: 600 }}>{row.on_time_count.toLocaleString()}</td>
                        <td style={{ padding: '14px 12px' }}>
                          <span onClick={() => setPopup({ bookings: row.lateBookings, title: `Late Deliveries - ${row.State}` })} style={{ color: Z2U.melon, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>{row.late_count.toLocaleString()}</span>
                        </td>
                        <td style={{ padding: '14px 12px' }}><ProgressBar value={row.difot_pct} color={getColorForDifot(row.difot_pct)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}

          {/* SPEED TAB */}
          {activeTab === 'speed' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {stats.speedData.map(speed => {
                  const col = speed.DeliverySpeed === 'VIP' ? Z2U.melon : speed.DeliverySpeed === '3 hour' ? Z2U.blue : Z2U.green;
                  return (
                    <Card key={speed.DeliverySpeed} style={{ borderTop: `4px solid ${col}`, cursor: 'pointer' }} onClick={() => setPopup({ bookings: speed.lateBookings, title: `Late Deliveries - ${speed.DeliverySpeed}` })}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ background: col, color: Z2U.white, padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, display: 'inline-block', marginBottom: '14px' }}>{speed.DeliverySpeed.toUpperCase()}</div>
                          <p style={{ color: Z2U.grey, fontSize: '44px', fontWeight: 800, margin: '0 0 8px' }}>{speed.difot_pct}%</p>
                          <p style={{ color: Z2U.grey400, fontSize: '13px', margin: 0 }}>{speed.on_time_count.toLocaleString()} / {speed.total.toLocaleString()} deliveries</p>
                          <p style={{ color: Z2U.melon, fontSize: '12px', marginTop: '4px' }}>Click to view {speed.lateBookings.length} late →</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              <Card>
                <SectionHeader title="Performance by Distance" subtitle="Click to view late bookings" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {stats.distanceData.map(d => (
                    <div key={d.distance_category} onClick={() => setPopup({ bookings: d.lateBookings, title: `Late Deliveries - ${d.distance_category}` })} style={{ background: Z2U.grey50, borderRadius: '16px', padding: '20px', border: `1px solid ${Z2U.grey200}`, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <span style={{ color: Z2U.blue, fontWeight: 700 }}>{d.distance_category}</span>
                        <span style={{ color: getColorForDifot(d.difot_pct), fontWeight: 700 }}>{d.difot_pct}%</span>
                      </div>
                      <p style={{ color: Z2U.grey, fontSize: '24px', fontWeight: 800, margin: '0 0 6px' }}>{d.total.toLocaleString()}</p>
                      <p style={{ color: Z2U.melon, fontSize: '12px' }}>{d.lateBookings.length} late - click to view →</p>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* TIME TAB */}
          {activeTab === 'time' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Card>
                <SectionHeader title="DIFOT by Day of Week" />
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.dayData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={Z2U.grey200} />
                    <XAxis dataKey="day_short" stroke={Z2U.grey300} fontSize={12} />
                    <YAxis stroke={Z2U.grey300} fontSize={11} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="difot_pct" name="DIFOT %" radius={[8, 8, 0, 0]} fill={Z2U.blue} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <SectionHeader title="DIFOT by Hour" />
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={stats.hourData}>
                    <defs><linearGradient id="cH" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={Z2U.blue} stopOpacity={0.3}/><stop offset="95%" stopColor={Z2U.blue} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={Z2U.grey200} />
                    <XAxis dataKey="hour_label" stroke={Z2U.grey300} fontSize={10} />
                    <YAxis stroke={Z2U.grey300} fontSize={11} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="difot_pct" name="DIFOT %" stroke={Z2U.blue} strokeWidth={2} fill="url(#cH)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* DELAYS TAB */}
          {activeTab === 'delays' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {overdueChartData.map(item => {
                  const col = item.name === '2+ hours' ? Z2U.melon : item.name === '1-2 hours' ? Z2U.yellow : Z2U.blue;
                  return (
                    <Card key={item.name} style={{ textAlign: 'center', borderTop: `3px solid ${col}`, cursor: 'pointer' }} onClick={() => setPopup({ bookings: item.bookings, title: `Late Deliveries - ${item.name}` })}>
                      <p style={{ color: Z2U.grey400, fontSize: '11px', marginBottom: '10px', textTransform: 'uppercase', fontWeight: 700 }}>{item.name}</p>
                      <p style={{ color: Z2U.grey, fontSize: '30px', fontWeight: 800, margin: '0 0 6px' }}>{item.value.toLocaleString()}</p>
                      <p style={{ color: col, fontSize: '11px' }}>Click to view →</p>
                    </Card>
                  );
                })}
              </div>
              <Card style={{ marginBottom: '24px' }}>
                <SectionHeader title="Delays by Distance" subtitle="Click card to view delayed bookings" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {stats.delaysByDistance.map(dist => (
                    <div key={dist.distance} onClick={() => setPopup({ bookings: dist.lateBookings, title: `Late Deliveries - ${dist.distance}` })} style={{ background: Z2U.grey50, borderRadius: '16px', padding: '20px', border: `1px solid ${Z2U.grey200}`, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <span style={{ color: Z2U.grey, fontWeight: 700 }}>{dist.distance}</span>
                        <span style={{ background: dist.avg_overdue > 60 ? Z2U.melon : dist.avg_overdue > 30 ? Z2U.yellow : Z2U.blue, color: Z2U.white, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>Avg {dist.avg_overdue}m</span>
                      </div>
                      <p style={{ color: Z2U.grey, fontSize: '28px', fontWeight: 800, margin: '0 0 12px' }}>{dist.total_late.toLocaleString()} <span style={{ fontSize: '14px', color: Z2U.grey400 }}>delays</span></p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: `${Z2U.blue}15`, borderRadius: '8px' }}>
                          <p style={{ color: Z2U.blue, fontSize: '16px', fontWeight: 700, margin: 0 }}>{dist.minor}</p>
                          <p style={{ color: Z2U.grey400, fontSize: '10px', margin: '2px 0 0' }}>Minor</p>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: `${Z2U.yellow}15`, borderRadius: '8px' }}>
                          <p style={{ color: '#b8960a', fontSize: '16px', fontWeight: 700, margin: 0 }}>{dist.moderate}</p>
                          <p style={{ color: Z2U.grey400, fontSize: '10px', margin: '2px 0 0' }}>Moderate</p>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: `${Z2U.melon}15`, borderRadius: '8px' }}>
                          <p style={{ color: Z2U.melon, fontSize: '16px', fontWeight: 700, margin: 0 }}>{dist.critical}</p>
                          <p style={{ color: Z2U.grey400, fontSize: '10px', margin: '2px 0 0' }}>Critical</p>
                        </div>
                      </div>
                      <p style={{ color: Z2U.blue, fontSize: '11px', marginTop: '12px', textAlign: 'center' }}>Click to view all →</p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <SectionHeader title="Delay Severity" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {[
                    { label: 'Critical (1hr+)', color: Z2U.melon, bookings: [...stats.overdueData['1-2 hours'], ...stats.overdueData['2+ hours']] },
                    { label: 'Moderate (31-60m)', color: Z2U.yellow, bookings: stats.overdueData['31-60 mins'] },
                    { label: 'Minor (<30m)', color: Z2U.blue, bookings: [...stats.overdueData['1-15 mins'], ...stats.overdueData['16-30 mins']] }
                  ].map(cat => (
                    <div key={cat.label} onClick={() => setPopup({ bookings: cat.bookings, title: `Late Deliveries - ${cat.label}` })} style={{ background: `${cat.color}12`, border: `1px solid ${cat.color}30`, borderRadius: '16px', padding: '20px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        {cat.label.includes('Critical') ? <XCircle size={18} color={cat.color} /> : cat.label.includes('Moderate') ? <AlertTriangle size={18} color={cat.color} /> : <Clock size={18} color={cat.color} />}
                        <span style={{ color: cat.color, fontWeight: 700, fontSize: '13px' }}>{cat.label}</span>
                      </div>
                      <p style={{ color: Z2U.grey, fontSize: '32px', fontWeight: 800, margin: '0 0 6px' }}>{cat.bookings.length.toLocaleString()}</p>
                      <p style={{ color: cat.color, fontSize: '11px' }}>Click to view details →</p>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </>
      )}

      <div style={{ marginTop: '24px', textAlign: 'center', padding: '16px', borderTop: `1px solid ${Z2U.grey200}` }}>
        <p style={{ color: Z2U.grey400, fontSize: '12px', margin: 0 }}>
          Showing {stats.total.toLocaleString()} {clientFilter !== 'all' ? clientFilter + ' ' : ''}bookings for {getPeriodLabel()} — {allBookings.length.toLocaleString()} total loaded from sheet
        </p>
      </div>
    </div>
  );
}
