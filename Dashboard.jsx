import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Package, Clock, AlertTriangle, CheckCircle, XCircle, Calendar, Zap, Truck, ChevronLeft, ChevronRight, Filter, X, FileText, MapPin, User, Activity, History, Search, ArrowUpDown, Eye, Navigation, Phone, ChevronDown, ChevronUp, RefreshCw, Users, Timer, TrendingUp, BarChart3, Loader } from 'lucide-react';
import Papa from 'papaparse';

// ─── DATA SOURCE CONFIG ─────────────────────────────────────────────
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSZtC7Pdyd3JxmOAkNuoGT5LlbPt79Lg8qEYQbzN78rXqr3KSXoMJhcoUan2jsk2cTaBXepar2TEvzB/pub?gid=1081543573&single=true&output=csv';
const GOOGLE_SHEET_NOTES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSZtC7Pdyd3JxmOAkNuoGT5LlbPt79Lg8qEYQbzN78rXqr3KSXoMJhcoUan2jsk2cTaBXepar2TEvzB/pub?gid=697948410&single=true&output=csv';
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz-OTo5FI7I1qnxb8UcCJGoRatDCkvhmV7fzPeITWLQrjJWSdhYNDcSVbhL5OvIBAKG/exec';

// ─── ZOOM2U BRAND DESIGN SYSTEM ─────────────────────────────────────
const Z2U = {
  grey: '#4b5054', blue: '#00a7e2', melon: '#fd5373', green: '#76d750', yellow: '#ffd100',
  white: '#FFFFFF', grey50: '#F9FAFB', grey100: '#F3F4F6', grey200: '#E5E7EB', grey300: '#D1D5DB',
  grey400: '#9CA3AF', grey500: '#6B7280',
  chart: ['#00a7e2', '#4b5054', '#76d750', '#fd5373', '#ffd100', '#33b5e5']
};

function generateActiveBookings() {
  const couriers = ['Michael Chen', 'Sarah Williams', 'James Wilson', 'Emma Thompson', 'David Brown', 'Jessica Lee', 'Daniel Smith', 'Ashley Taylor', 'Ryan Garcia', 'Nicole Martinez'];
  const statuses = ['Awaiting pickup', 'Picked up', 'In transit', 'Out for delivery', 'Arriving soon'];
  const statusWeights = [0.12, 0.15, 0.35, 0.25, 0.13];
  const speeds = ['VIP', '3 hour', 'Same day'];
  const speedWeights = [0.56, 0.43, 0.01];
  const pickupAddresses = [
    'Dock 26, 2 Millennium Court, Matraville NSW 2036',
    'Fuji Xerox, 101 Waterloo Rd, Macquarie Park NSW 2113',
    'Bay 12, 55 Freight Rd, Alexandria NSW 2015'
  ];
  const dropAddresses = [
    { addr: '242 Parramatta Rd, Homebush NSW', state: 'NSW' },
    { addr: '57 Glebe Point Rd, Glebe NSW', state: 'NSW' },
    { addr: '400 Lane Cove Rd, North Ryde NSW', state: 'NSW' },
    { addr: '2/40 Miller St, North Sydney NSW', state: 'NSW' },
    { addr: '123 George St, Sydney CBD NSW', state: 'NSW' },
    { addr: '350 Collins St, Melbourne VIC', state: 'VIC' },
    { addr: '88 Queens Rd, South Melbourne VIC', state: 'VIC' },
    { addr: '123 Queen St, Brisbane QLD', state: 'QLD' },
    { addr: '100 St Georges Tce, Perth WA', state: 'WA' },
    { addr: '50 Grenfell St, Adelaide SA', state: 'SA' },
  ];

  function weightedRandom(items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) { if (r < weights[i]) return items[i]; r -= weights[i]; }
    return items[items.length - 1];
  }

  const active = [];
  const count = Math.floor(Math.random() * 8) + 12;
  for (let i = 0; i < count; i++) {
    const status = weightedRandom(statuses, statusWeights);
    const speed = weightedRandom(speeds, speedWeights);
    const drop = dropAddresses[Math.floor(Math.random() * dropAddresses.length)];
    const ref = `Z2026022${Math.floor(Math.random() * 5)}${Math.floor(Math.random() * 9000000) + 1000000}`;
    const prefixes = { NSW: 'LENO', VIC: 'MELB', QLD: 'BRIS', WA: 'PERT', SA: 'ADEL', ACT: 'CANB' };
    const po = `${prefixes[drop.state] || 'DROP'}${String(Math.floor(Math.random() * 900000) + 100000).padStart(8, '0')}`;
    const createdHour = Math.floor(Math.random() * 6) + 6;
    const createdMin = Math.floor(Math.random() * 60);
    const etaHour = createdHour + (speed === 'VIP' ? Math.floor(Math.random() * 2) + 1 : speed === '3 hour' ? Math.floor(Math.random() * 2) + 2 : Math.floor(Math.random() * 4) + 4);
    const etaMin = Math.floor(Math.random() * 60);
    let progress = 0;
    if (status === 'Awaiting pickup') progress = Math.floor(Math.random() * 10);
    else if (status === 'Picked up') progress = Math.floor(Math.random() * 15) + 10;
    else if (status === 'In transit') progress = Math.floor(Math.random() * 30) + 30;
    else if (status === 'Out for delivery') progress = Math.floor(Math.random() * 20) + 65;
    else if (status === 'Arriving soon') progress = Math.floor(Math.random() * 10) + 88;
    const isAtRisk = status === 'In transit' && Math.random() < 0.2;

    active.push({
      booking_ref: ref, po, courier: couriers[Math.floor(Math.random() * couriers.length)],
      courier_phone: `04${Math.floor(Math.random() * 90000000) + 10000000}`,
      pickup_address: pickupAddresses[Math.floor(Math.random() * pickupAddresses.length)],
      drop_address: drop.addr, state: drop.state, speed, status, progress,
      is_at_risk: isAtRisk,
      created_time: `${String(createdHour).padStart(2, '0')}:${String(createdMin).padStart(2, '0')}`,
      eta: `${String(Math.min(etaHour, 23)).padStart(2, '0')}:${String(etaMin).padStart(2, '0')}`,
      distance: ['0-30km', '30.01-50km', '50.01+km'][Math.floor(Math.random() * 3)],
      notes: Math.random() < 0.4 ? ['Customer requested contactless delivery'] : []
    });
  }
  return active.sort((a, b) => {
    const o = { 'Arriving soon': 0, 'Out for delivery': 1, 'In transit': 2, 'Picked up': 3, 'Awaiting pickup': 4 };
    return (o[a.status] || 5) - (o[b.status] || 5);
  });
}

// ─── CSV COLUMN MAPPER ──────────────────────────────────────────────
function mapCSVRow(row) {
  // Map CSV columns to our internal format. Adjust these mappings
  // to match your actual Google Sheet column headers.
  const get = (keys) => {
    for (const k of keys) {
      const val = row[k] || row[k.toLowerCase()] || row[k.toUpperCase()];
      if (val !== undefined && val !== '') return val;
    }
    return null;
  };

  const bookingRef = get(['Booking Ref', 'booking_ref', 'Reference', 'Ref', 'BookingRef']) || '';
  const po = get(['PO', 'PO Number', 'po', 'PurchaseOrder']) || '';
  const courier = get(['Courier', 'courier', 'Driver', 'driver', 'Courier Name']) || '';
  const pickupAddress = get(['Pickup Address', 'pickup_address', 'From', 'Pickup']) || '';
  const dropAddress = get(['Drop Address', 'drop_address', 'To', 'Delivery Address', 'Drop']) || '';
  const date = get(['Date', 'date', 'Booking Date', 'Created Date']) || '';
  const state = get(['State', 'state', 'Region']) || '';
  const speed = get(['Speed', 'speed', 'Service', 'Delivery Speed', 'Service Type']) || '';
  const distance = get(['Distance', 'distance', 'Distance Category']) || '';
  const onTimeRaw = get(['On Time', 'on_time', 'OnTime', 'DIFOT']);
  const on_time = onTimeRaw === 'true' || onTimeRaw === 'TRUE' || onTimeRaw === '1' || onTimeRaw === 'Yes' || onTimeRaw === 'Y';
  const overdue_mins = parseInt(get(['Overdue Mins', 'overdue_mins', 'Delay', 'Delay Minutes', 'Late Minutes']) || '0') || 0;
  const bookingTime = get(['Booking Time', 'booking_time', 'Created Time', 'Time']) || '';
  const requestedPickupTime = get(['Requested Pickup Time', 'requested_pickup_time', 'Req Pickup']) || '';
  const actualPickupTime = get(['Actual Pickup Time', 'actual_pickup_time', 'Pickup Time', 'Picked Up']) || '';
  const slaMinutes = parseInt(get(['SLA Minutes', 'sla_minutes', 'SLA', 'Expected SLA']) || '0') || 0;
  const expectedDeliveryTime = get(['Expected Delivery Time', 'expected_delivery_time', 'SLA Time', 'Due By']) || '';
  const actualDeliveryTime = get(['Actual Delivery Time', 'actual_delivery_time', 'Delivered Time', 'Delivered At']) || '';
  const bookingToPickup = parseInt(get(['Booking to Pickup', 'booking_to_pickup_mins', 'Wait Time']) || '0') || 0;
  const pickupToDelivery = parseInt(get(['Pickup to Delivery', 'pickup_to_delivery_mins', 'Transit Time']) || '0') || 0;

  // Parse hour from booking time or date
  let hour = 0;
  if (bookingTime) {
    const parts = bookingTime.split(':');
    hour = parseInt(parts[0]) || 0;
  } else {
    hour = parseInt(get(['Hour', 'hour', 'Booking Hour']) || '0') || 0;
  }

  // Normalize date format
  let normalizedDate = date;
  if (date && date.includes('/')) {
    const parts = date.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      else normalizedDate = `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  return {
    booking_ref: bookingRef, po, courier, pickup_address: pickupAddress,
    drop_address: dropAddress, date: normalizedDate, state, speed, distance,
    on_time: overdue_mins === 0 ? true : on_time, // 0 min overdue = on time
    overdue_mins,
    hour, booking_time: bookingTime, requested_pickup_time: requestedPickupTime,
    actual_pickup_time: actualPickupTime, sla_minutes: slaMinutes,
    expected_delivery_time: expectedDeliveryTime, actual_delivery_time: actualDeliveryTime,
    booking_to_pickup_mins: bookingToPickup, pickup_to_delivery_mins: pickupToDelivery,
    notes: [], status: 'delivered'
  };
}

// ─── HELPER FUNCTIONS ───────────────────────────────────────────────
const formatHour = (h) => h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`;
const formatDateDisplay = (dateStr) => new Date(dateStr).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const getWeekStart = (date) => { const d = new Date(date); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split('T')[0]; };
const getWeekEnd = (date) => { const d = new Date(getWeekStart(date)); d.setDate(d.getDate() + 6); return d.toISOString().split('T')[0]; };
const getColorForDifot = (pct) => pct >= 75 ? Z2U.green : pct >= 60 ? Z2U.blue : Z2U.melon;
const fmtMins = (m) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;

// ─── UI COMPONENTS ──────────────────────────────────────────────────
const Card = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{ background: Z2U.white, borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(75,80,84,0.08)', border: `1px solid ${Z2U.grey200}`, ...style }}>{children}</div>
);

const KPICard = ({ title, value, subtitle, icon: Icon, color, onClick }) => (
  <Card style={{ cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.15s, box-shadow 0.15s' }} onClick={onClick}>
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
  <button onClick={onClick} style={{ background: active ? Z2U.blue : 'transparent', border: active ? 'none' : `1px solid ${Z2U.grey200}`, borderRadius: '24px', padding: '10px 18px', color: active ? Z2U.white : Z2U.grey, fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
          {entry.name}: {entry.dataKey?.includes('pct') || entry.dataKey?.includes('Pct') ? `${entry.value}%` : typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
};

const StatusBadge = ({ status, isAtRisk }) => {
  const cfg = {
    'Awaiting pickup': { bg: `${Z2U.grey400}20`, color: Z2U.grey500, dot: Z2U.grey400 },
    'Picked up': { bg: `${Z2U.blue}15`, color: Z2U.blue, dot: Z2U.blue },
    'In transit': { bg: `${Z2U.blue}20`, color: Z2U.blue, dot: Z2U.blue },
    'Out for delivery': { bg: `${Z2U.green}18`, color: '#4da832', dot: Z2U.green },
    'Arriving soon': { bg: `${Z2U.green}25`, color: '#3d8a28', dot: Z2U.green },
  }[status] || { bg: `${Z2U.blue}20`, color: Z2U.blue, dot: Z2U.blue };
  const bg = isAtRisk ? `${Z2U.yellow}25` : cfg.bg;
  const color = isAtRisk ? '#b8960a' : cfg.color;
  const dot = isAtRisk ? Z2U.yellow : cfg.dot;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: bg, color, padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot, display: 'inline-block', animation: (status === 'In transit' || status === 'Arriving soon') ? 'pulse 2s infinite' : 'none' }} />
      {isAtRisk ? 'At risk' : status}
    </span>
  );
};

const DeliveryProgress = ({ progress, isAtRisk }) => (
  <div style={{ width: '100%', height: '6px', background: Z2U.grey100, borderRadius: '3px', overflow: 'hidden' }}>
    <div style={{ width: `${progress}%`, height: '100%', background: isAtRisk ? Z2U.yellow : progress > 80 ? Z2U.green : Z2U.blue, borderRadius: '3px', transition: 'width 0.5s ease' }} />
  </div>
);

const SpeedBadge = ({ speed, small }) => {
  const col = speed === 'VIP' ? Z2U.melon : speed === '3 hour' ? Z2U.blue : Z2U.green;
  return <span style={{ background: col, color: Z2U.white, padding: small ? '2px 8px' : '4px 10px', borderRadius: '12px', fontSize: small ? '10px' : '11px', fontWeight: 700 }}>{speed}</span>;
};

// ─── DELAYED BOOKINGS POPUP ─────────────────────────────────────────
const DelayedBookingsPopup = ({ bookings, onClose, title }) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('overdue_mins');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedRef, setExpandedRef] = useState(null);

  // Filter out 0-min overdue (they get a pass)
  const realLate = bookings.filter(b => b.overdue_mins > 0);

  const filtered = realLate.filter(b =>
    b.booking_ref.toLowerCase().includes(search.toLowerCase()) ||
    b.po.toLowerCase().includes(search.toLowerCase()) ||
    b.courier.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    const m = sortDir === 'desc' ? -1 : 1;
    if (sortBy === 'overdue_mins') return m * (a.overdue_mins - b.overdue_mins);
    if (sortBy === 'date') return m * a.date.localeCompare(b.date);
    if (sortBy === 'booking_ref') return m * a.booking_ref.localeCompare(b.booking_ref);
    return 0;
  });

  const getDelayColor = (mins) => mins <= 30 ? Z2U.blue : mins <= 60 ? Z2U.yellow : Z2U.melon;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: Z2U.white, borderRadius: '20px', width: '90%', maxWidth: '1000px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${Z2U.grey200}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: Z2U.grey, fontSize: '20px', fontWeight: 700, margin: 0 }}>{title || 'Delayed bookings'}</h2>
            <p style={{ color: Z2U.grey400, fontSize: '13px', margin: '4px 0 0' }}>{filtered.length} bookings found</p>
          </div>
          <button onClick={onClose} style={{ background: Z2U.grey100, border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} color={Z2U.grey} /></button>
        </div>

        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${Z2U.grey100}`, display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input type="text" placeholder="Search by reference, PO, or courier..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, padding: '10px 16px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', fontSize: '14px', outline: 'none' }} />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '10px 16px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', fontSize: '14px', background: Z2U.white }}>
            <option value="overdue_mins">Sort by delay</option>
            <option value="date">Sort by date</option>
            <option value="booking_ref">Sort by reference</option>
          </select>
          <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')} style={{ padding: '10px 16px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', background: Z2U.white, cursor: 'pointer', fontSize: '14px' }}>
            {sortDir === 'desc' ? '↓ Desc' : '↑ Asc'}
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: Z2U.grey400 }}>
              <Package size={48} style={{ marginBottom: '12px', opacity: 0.5 }} /><p>No bookings found</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filtered.slice(0, 100).map(booking => {
                const isExpanded = expandedRef === booking.booking_ref;
                return (
                  <div key={booking.booking_ref} style={{ border: `1px solid ${Z2U.grey200}`, borderRadius: '12px', overflow: 'hidden' }}>
                    <div onClick={() => setExpandedRef(isExpanded ? null : booking.booking_ref)} style={{ padding: '16px', cursor: 'pointer', background: isExpanded ? Z2U.grey50 : Z2U.white, display: 'grid', gridTemplateColumns: '1fr 120px 100px 80px 100px', gap: '16px', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ color: Z2U.blue, fontWeight: 700, fontSize: '14px' }}>{booking.booking_ref}</span>
                          {booking.notes.length > 0 && <span style={{ background: Z2U.yellow, color: Z2U.grey, padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700 }}>{booking.notes.length} note{booking.notes.length > 1 ? 's' : ''}</span>}
                        </div>
                        <span style={{ color: Z2U.grey400, fontSize: '12px' }}>PO: {booking.po}</span>
                      </div>
                      <div>
                        <span style={{ color: Z2U.grey, fontSize: '13px' }}>{booking.date}</span>
                      </div>
                      <SpeedBadge speed={booking.speed} />
                      <span style={{ color: Z2U.grey, fontSize: '13px' }}>{booking.state}</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ background: getDelayColor(booking.overdue_mins), color: Z2U.white, padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>+{booking.overdue_mins}m</span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{ padding: '0 16px 16px', background: Z2U.grey50, borderTop: `1px solid ${Z2U.grey200}` }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', paddingTop: '16px' }}>
                          <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px' }}>Courier</p><p style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600, margin: 0 }}>{booking.courier}</p></div>
                          <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px' }}>Distance</p><p style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600, margin: 0 }}>{booking.distance}</p></div>
                          <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px' }}>Booked</p><p style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600, margin: 0 }}>{booking.booking_time || formatHour(booking.hour)}</p></div>
                          <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px' }}>SLA</p><p style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600, margin: 0 }}>{booking.sla_minutes ? `${booking.sla_minutes}m` : '-'}</p></div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginTop: '12px' }}>
                          <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px' }}>Expected delivery</p><p style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600, margin: 0 }}>{booking.expected_delivery_time || '-'}</p></div>
                          <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px' }}>Delivered at</p><p style={{ color: Z2U.melon, fontSize: '14px', fontWeight: 600, margin: 0 }}>{booking.actual_delivery_time || '-'}</p></div>
                          <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px' }}>Booking → pickup</p><p style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600, margin: 0 }}>{booking.booking_to_pickup_mins ? fmtMins(booking.booking_to_pickup_mins) : '-'}</p></div>
                          <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px' }}>Pickup → delivery</p><p style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600, margin: 0 }}>{booking.pickup_to_delivery_mins ? fmtMins(booking.pickup_to_delivery_mins) : '-'}</p></div>
                        </div>
                        <div style={{ marginTop: '12px' }}>
                          <p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px' }}>Drop address</p>
                          <p style={{ color: Z2U.grey, fontSize: '13px', margin: 0 }}>{booking.drop_address}</p>
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          <p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px' }}>Pickup address</p>
                          <p style={{ color: Z2U.grey, fontSize: '13px', margin: 0 }}>{booking.pickup_address}</p>
                        </div>
                        {booking.notes.length > 0 && (
                          <div style={{ marginTop: '16px', padding: '16px', background: Z2U.white, borderRadius: '10px', border: `1px solid ${Z2U.grey200}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                              <FileText size={14} color={Z2U.blue} /><span style={{ color: Z2U.blue, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>Notes ({booking.notes.length})</span>
                            </div>
                            {booking.notes.map((note, i) => (
                              <div key={i} style={{ padding: '10px 12px', background: Z2U.grey50, borderRadius: '8px', borderLeft: `3px solid ${Z2U.blue}`, marginBottom: i < booking.notes.length - 1 ? '8px' : 0 }}>
                                <p style={{ color: Z2U.grey, fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{note}</p>
                              </div>
                            ))}
                          </div>
                        )}
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

// ─── ACTIVE BOOKING DETAIL POPUP ────────────────────────────────────
const ActiveBookingDetail = ({ booking, onClose }) => {
  if (!booking) return null;
  const timeline = [];
  if (booking.status !== 'Awaiting pickup') {
    timeline.push({ time: booking.created_time, label: 'Booking created', done: true });
    timeline.push({ time: '', label: 'Picked up', done: booking.progress > 15 });
    if (booking.progress > 30) timeline.push({ time: '', label: 'In transit', done: true, active: booking.status === 'In transit' });
    if (booking.progress > 65) timeline.push({ time: '', label: 'Out for delivery', done: true, active: booking.status === 'Out for delivery' });
    if (booking.progress > 88) timeline.push({ time: booking.eta, label: 'Arriving soon', done: false, active: booking.status === 'Arriving soon' });
  } else {
    timeline.push({ time: booking.created_time, label: 'Booking created', done: true });
    timeline.push({ time: '', label: 'Awaiting courier pickup', done: false, active: true });
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: Z2U.white, borderRadius: '20px', width: '90%', maxWidth: '600px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${Z2U.grey200}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h2 style={{ color: Z2U.grey, fontSize: '20px', fontWeight: 700, margin: 0 }}>{booking.booking_ref}</h2>
              <SpeedBadge speed={booking.speed} />
            </div>
            <p style={{ color: Z2U.grey400, fontSize: '13px', margin: 0 }}>PO: {booking.po}</p>
          </div>
          <button onClick={onClose} style={{ background: Z2U.grey100, border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} color={Z2U.grey} /></button>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <StatusBadge status={booking.status} isAtRisk={booking.is_at_risk} />
              <span style={{ color: Z2U.grey400, fontSize: '13px' }}>ETA: <strong style={{ color: Z2U.grey }}>{booking.eta}</strong></span>
            </div>
            <DeliveryProgress progress={booking.progress} isAtRisk={booking.is_at_risk} />
            <p style={{ color: Z2U.grey400, fontSize: '12px', marginTop: '6px', textAlign: 'right' }}>{booking.progress}% complete</p>
          </div>
          <div style={{ background: Z2U.grey50, borderRadius: '14px', padding: '18px', marginBottom: '20px', border: `1px solid ${Z2U.grey200}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: `${Z2U.blue}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={22} color={Z2U.blue} /></div>
                <div>
                  <p style={{ color: Z2U.grey, fontSize: '15px', fontWeight: 700, margin: 0 }}>{booking.courier}</p>
                  <p style={{ color: Z2U.grey400, fontSize: '12px', margin: '2px 0 0' }}>{booking.courier_phone}</p>
                </div>
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `${Z2U.green}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Phone size={16} color={Z2U.green} /></div>
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', paddingTop: '4px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: Z2U.blue }} />
                <div style={{ width: '2px', flex: 1, background: Z2U.grey200 }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: Z2U.melon }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Pickup</p>
                  <p style={{ color: Z2U.grey, fontSize: '13px', margin: 0 }}>{booking.pickup_address}</p>
                </div>
                <div>
                  <p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Drop-off</p>
                  <p style={{ color: Z2U.grey, fontSize: '13px', margin: 0 }}>{booking.drop_address}</p>
                </div>
              </div>
            </div>
          </div>
          <div style={{ background: Z2U.grey50, borderRadius: '14px', padding: '18px', border: `1px solid ${Z2U.grey200}` }}>
            <p style={{ color: Z2U.grey, fontSize: '13px', fontWeight: 700, margin: '0 0 16px', textTransform: 'uppercase' }}>Tracking timeline</p>
            {timeline.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', paddingBottom: i < timeline.length - 1 ? '16px' : '0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px' }}>
                  <div style={{ width: step.active ? '12px' : '10px', height: step.active ? '12px' : '10px', borderRadius: '50%', background: step.done ? Z2U.green : step.active ? Z2U.blue : Z2U.grey200, flexShrink: 0 }} />
                  {i < timeline.length - 1 && <div style={{ width: '2px', flex: 1, background: step.done ? Z2U.green : Z2U.grey200, minHeight: '12px' }} />}
                </div>
                <div>
                  <p style={{ color: step.done || step.active ? Z2U.grey : Z2U.grey400, fontSize: '13px', fontWeight: step.active ? 700 : 500, margin: 0 }}>{step.label}</p>
                  {step.time && <p style={{ color: Z2U.grey400, fontSize: '11px', margin: '2px 0 0' }}>{step.time}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


// ─── MAIN DASHBOARD ─────────────────────────────────────────────────
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateFilter, setDateFilter] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [popup, setPopup] = useState(null);
  const [activeDetail, setActiveDetail] = useState(null);
  const [dataSource, setDataSource] = useState('loading'); // 'loading' | 'loaded' | 'error'
  const [loadError, setLoadError] = useState(null);
  const [allBookings, setAllBookings] = useState([]);
  const [activeBookingsData, setActiveBookingsData] = useState([]);

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

  // Active tab state
  const [activeSearch, setActiveSearch] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('all');

  // ─── DATA LOADING ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [bookingsRes, notesRes] = await Promise.all([
          new Promise((resolve, reject) => {
            Papa.parse(GOOGLE_SHEET_CSV_URL, {
              download: true, header: true, skipEmptyLines: true,
              complete: (results) => resolve(results),
              error: (err) => reject(err)
            });
          }),
          new Promise((resolve, reject) => {
            Papa.parse(GOOGLE_SHEET_NOTES_CSV_URL, {
              download: true, header: true, skipEmptyLines: true,
              complete: (results) => resolve(results),
              error: (err) => reject(err)
            });
          }).catch(() => ({ data: [] }))
        ]);

        if (cancelled) return;

        if (!bookingsRes.data || bookingsRes.data.length === 0) {
          setLoadError('No booking data found in the Google Sheet. Check that the sheet is published and the URL is correct.');
          setDataSource('error');
          return;
        }

        // Map CSV rows
        const mapped = bookingsRes.data.map(mapCSVRow).filter(b => b.booking_ref && b.date);

        if (mapped.length === 0) {
          setLoadError('Could not parse any bookings from the sheet. Check that column headers match expected format (see README).');
          setDataSource('error');
          return;
        }

        // Attach notes
        if (notesRes.data && notesRes.data.length > 0) {
          const notesMap = {};
          notesRes.data.forEach(n => {
            const ref = n['Booking Ref'] || n['booking_ref'] || n['Reference'] || '';
            const note = n['Note'] || n['note'] || n['Notes'] || n['Comment'] || '';
            if (ref && note) {
              if (!notesMap[ref]) notesMap[ref] = [];
              notesMap[ref].push(note);
            }
          });
          mapped.forEach(b => {
            if (notesMap[b.booking_ref]) b.notes = notesMap[b.booking_ref];
          });
        }

        setAllBookings(mapped);
        setActiveBookingsData(generateActiveBookings());
        setDataSource('loaded');
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load Google Sheets data:', err);
        setLoadError(`Could not connect to Google Sheets: ${err.message}`);
        setDataSource('error');
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  // ─── FILTERED DATA ─────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!allBookings.length) return [];
    let startDate, endDate;
    const selected = new Date(selectedDate);
    switch (dateFilter) {
      case 'day': startDate = endDate = selectedDate; break;
      case 'week': startDate = getWeekStart(selectedDate); endDate = getWeekEnd(selectedDate); break;
      case 'month': startDate = `${selectedDate.slice(0, 7)}-01`; endDate = new Date(selected.getFullYear(), selected.getMonth() + 1, 0).toISOString().split('T')[0]; break;
      case 'year': startDate = `${selected.getFullYear()}-01-01`; endDate = `${selected.getFullYear()}-12-31`; break;
      default: startDate = endDate = selectedDate;
    }
    return allBookings.filter(b => b.date >= startDate && b.date <= endDate);
  }, [dateFilter, selectedDate, allBookings]);

  // ─── STATS ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = filteredData.length;
    // 0-min overdue = on time (give them a pass)
    const onTime = filteredData.filter(b => b.on_time || b.overdue_mins === 0).length;
    const late = total - onTime;
    const difot = total > 0 ? ((onTime / total) * 100).toFixed(1) : 0;
    const lateBookings = filteredData.filter(b => !b.on_time && b.overdue_mins > 0);

    const stateMap = {};
    filteredData.forEach(b => {
      if (!stateMap[b.state]) stateMap[b.state] = { total: 0, onTime: 0, lateBookings: [] };
      stateMap[b.state].total++;
      if (b.on_time || b.overdue_mins === 0) stateMap[b.state].onTime++;
      else stateMap[b.state].lateBookings.push(b);
    });
    const stateData = Object.entries(stateMap).map(([state, data]) => ({
      State: state, total: data.total, on_time_count: data.onTime, late_count: data.total - data.onTime,
      difot_pct: parseFloat(((data.onTime / data.total) * 100).toFixed(1)), lateBookings: data.lateBookings
    })).sort((a, b) => b.difot_pct - a.difot_pct);

    const speedMap = {};
    filteredData.forEach(b => {
      if (!speedMap[b.speed]) speedMap[b.speed] = { total: 0, onTime: 0, lateBookings: [] };
      speedMap[b.speed].total++;
      if (b.on_time || b.overdue_mins === 0) speedMap[b.speed].onTime++;
      else speedMap[b.speed].lateBookings.push(b);
    });
    const speedData = Object.entries(speedMap).map(([speed, data]) => ({
      DeliverySpeed: speed, total: data.total, on_time_count: data.onTime,
      difot_pct: parseFloat(((data.onTime / data.total) * 100).toFixed(1)), lateBookings: data.lateBookings
    }));

    const hourMap = {};
    filteredData.forEach(b => {
      if (!hourMap[b.hour]) hourMap[b.hour] = { total: 0, onTime: 0 };
      hourMap[b.hour].total++;
      if (b.on_time || b.overdue_mins === 0) hourMap[b.hour].onTime++;
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
      if (b.on_time || b.overdue_mins === 0) distMap[b.distance].onTime++;
      else distMap[b.distance].lateBookings.push(b);
    });
    const distanceData = Object.entries(distMap).map(([dist, data]) => ({
      distance_category: dist, total: data.total, on_time_count: data.onTime,
      difot_pct: parseFloat(((data.onTime / data.total) * 100).toFixed(1)), lateBookings: data.lateBookings
    }));

    const dayMap = { Monday: { total: 0, onTime: 0 }, Tuesday: { total: 0, onTime: 0 }, Wednesday: { total: 0, onTime: 0 }, Thursday: { total: 0, onTime: 0 }, Friday: { total: 0, onTime: 0 }, Saturday: { total: 0, onTime: 0 }, Sunday: { total: 0, onTime: 0 } };
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    filteredData.forEach(b => {
      const day = dayNames[new Date(b.date).getDay()];
      dayMap[day].total++;
      if (b.on_time || b.overdue_mins === 0) dayMap[day].onTime++;
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

    // Pickup location breakdown
    const pickupMap = {};
    filteredData.forEach(b => {
      const loc = b.pickup_address || 'Unknown';
      if (!pickupMap[loc]) pickupMap[loc] = { total: 0, onTime: 0, lateBookings: [], totalBookingToPickup: 0, totalPickupToDelivery: 0, count: 0 };
      pickupMap[loc].total++;
      if (b.on_time || b.overdue_mins === 0) pickupMap[loc].onTime++;
      else pickupMap[loc].lateBookings.push(b);
      if (b.booking_to_pickup_mins) { pickupMap[loc].totalBookingToPickup += b.booking_to_pickup_mins; pickupMap[loc].count++; }
      if (b.pickup_to_delivery_mins) pickupMap[loc].totalPickupToDelivery += b.pickup_to_delivery_mins;
    });
    const pickupData = Object.entries(pickupMap).map(([loc, d]) => ({
      location: loc, total: d.total, on_time: d.onTime, late: d.total - d.onTime,
      difot_pct: parseFloat(((d.onTime / d.total) * 100).toFixed(1)), lateBookings: d.lateBookings,
      avg_booking_to_pickup: d.count > 0 ? Math.round(d.totalBookingToPickup / d.count) : 0,
      avg_pickup_to_delivery: d.count > 0 ? Math.round(d.totalPickupToDelivery / d.count) : 0,
      isFuji: loc.toLowerCase().includes('fuji')
    })).sort((a, b) => b.total - a.total);

    // Driver analysis
    const driverMap = {};
    filteredData.forEach(b => {
      if (!driverMap[b.courier]) driverMap[b.courier] = { total: 0, onTime: 0, lateBookings: [], totalOverdue: 0, totalBTP: 0, totalPTD: 0, count: 0 };
      const dm = driverMap[b.courier];
      dm.total++;
      if (b.on_time || b.overdue_mins === 0) dm.onTime++;
      else { dm.lateBookings.push(b); dm.totalOverdue += b.overdue_mins; }
      if (b.booking_to_pickup_mins) { dm.totalBTP += b.booking_to_pickup_mins; dm.count++; }
      if (b.pickup_to_delivery_mins) dm.totalPTD += b.pickup_to_delivery_mins;
    });
    const driverData = Object.entries(driverMap).map(([name, d]) => ({
      name, total: d.total, on_time: d.onTime, late: d.total - d.onTime,
      difot_pct: parseFloat(((d.onTime / d.total) * 100).toFixed(1)), lateBookings: d.lateBookings,
      avg_delay: d.lateBookings.length > 0 ? Math.round(d.totalOverdue / d.lateBookings.length) : 0,
      avg_booking_to_pickup: d.count > 0 ? Math.round(d.totalBTP / d.count) : 0,
      avg_pickup_to_delivery: d.count > 0 ? Math.round(d.totalPTD / d.count) : 0,
    })).sort((a, b) => b.difot_pct - a.difot_pct);

    // Timing analysis
    const timingBookings = filteredData.filter(b => b.booking_to_pickup_mins && b.pickup_to_delivery_mins);
    const avgBookingToPickup = timingBookings.length > 0 ? Math.round(timingBookings.reduce((s, b) => s + b.booking_to_pickup_mins, 0) / timingBookings.length) : 0;
    const avgPickupToDelivery = timingBookings.length > 0 ? Math.round(timingBookings.reduce((s, b) => s + b.pickup_to_delivery_mins, 0) / timingBookings.length) : 0;

    // BTP distribution
    const btpBuckets = { '0-10m': 0, '11-20m': 0, '21-30m': 0, '31-45m': 0, '46-60m': 0, '60m+': 0 };
    timingBookings.forEach(b => {
      const m = b.booking_to_pickup_mins;
      if (m <= 10) btpBuckets['0-10m']++;
      else if (m <= 20) btpBuckets['11-20m']++;
      else if (m <= 30) btpBuckets['21-30m']++;
      else if (m <= 45) btpBuckets['31-45m']++;
      else if (m <= 60) btpBuckets['46-60m']++;
      else btpBuckets['60m+']++;
    });
    const btpData = Object.entries(btpBuckets).map(([bucket, count]) => ({ bucket, count }));

    // PTD by speed
    const ptdBySpeed = {};
    timingBookings.forEach(b => {
      if (!ptdBySpeed[b.speed]) ptdBySpeed[b.speed] = { total: 0, sum: 0 };
      ptdBySpeed[b.speed].total++;
      ptdBySpeed[b.speed].sum += b.pickup_to_delivery_mins;
    });
    const ptdSpeedData = Object.entries(ptdBySpeed).map(([speed, d]) => ({
      speed, avg: Math.round(d.sum / d.total), count: d.total
    }));

    // BTP vs on_time correlation
    const btpCorrelation = [
      { range: '0-10m', ...calcCorr(timingBookings.filter(b => b.booking_to_pickup_mins <= 10)) },
      { range: '11-20m', ...calcCorr(timingBookings.filter(b => b.booking_to_pickup_mins > 10 && b.booking_to_pickup_mins <= 20)) },
      { range: '21-30m', ...calcCorr(timingBookings.filter(b => b.booking_to_pickup_mins > 20 && b.booking_to_pickup_mins <= 30)) },
      { range: '31m+', ...calcCorr(timingBookings.filter(b => b.booking_to_pickup_mins > 30)) },
    ];

    return {
      total, onTime, late, difot, stateData, speedData, hourData, distanceData, dayData,
      overdueData, delaysByDistance, lateBookings, pickupData, driverData,
      avgBookingToPickup, avgPickupToDelivery, btpData, ptdSpeedData, btpCorrelation
    };
  }, [filteredData]);

  // Filtered active bookings
  const filteredActive = useMemo(() => {
    return activeBookingsData.filter(b => {
      const matchSearch = !activeSearch || b.booking_ref.toLowerCase().includes(activeSearch.toLowerCase()) || b.courier.toLowerCase().includes(activeSearch.toLowerCase()) || b.po.toLowerCase().includes(activeSearch.toLowerCase());
      const matchStatus = activeStatusFilter === 'all' || b.status === activeStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [activeSearch, activeStatusFilter, activeBookingsData]);

  // Filtered & paginated delivery history
  const historyData = useMemo(() => {
    let data = [...filteredData];
    if (historySearch) {
      const q = historySearch.toLowerCase();
      data = data.filter(b => b.booking_ref.toLowerCase().includes(q) || b.po.toLowerCase().includes(q) || b.courier.toLowerCase().includes(q) || b.drop_address.toLowerCase().includes(q) || b.pickup_address.toLowerCase().includes(q));
    }
    if (historyStatusFilter === 'on_time') data = data.filter(b => b.on_time || b.overdue_mins === 0);
    if (historyStatusFilter === 'late') data = data.filter(b => !b.on_time && b.overdue_mins > 0);
    if (historySpeedFilter !== 'all') data = data.filter(b => b.speed === historySpeedFilter);
    if (historyStateFilter !== 'all') data = data.filter(b => b.state === historyStateFilter);

    data.sort((a, b) => {
      const m = historySortDir === 'desc' ? -1 : 1;
      if (historySort === 'date') return m * a.date.localeCompare(b.date);
      if (historySort === 'ref') return m * a.booking_ref.localeCompare(b.booking_ref);
      if (historySort === 'overdue') return m * (a.overdue_mins - b.overdue_mins);
      if (historySort === 'state') return m * a.state.localeCompare(b.state);
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
      case 'week': return `${formatDateDisplay(getWeekStart(selectedDate)).split(' ').slice(0, 3).join(' ')} – ${formatDateDisplay(getWeekEnd(selectedDate)).split(' ').slice(0, 3).join(' ')}`;
      case 'month': return d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
      case 'year': return d.getFullYear().toString();
      default: return '';
    }
  };

  const pieData = [{ name: 'On time', value: stats.onTime, fill: Z2U.green }, { name: 'Late', value: stats.late, fill: Z2U.melon }];
  const overdueChartData = Object.entries(stats.overdueData).map(([name, arr]) => ({ name, value: arr.length, bookings: arr }));
  const activeStatuses = [...new Set(activeBookingsData.map(b => b.status))];
  const uniqueStates = [...new Set(filteredData.map(b => b.state))].sort();

  // ─── LOADING STATE ──────────────────────────────────────────────
  if (dataSource === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: Z2U.grey50, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <Loader size={48} color={Z2U.blue} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
          <p style={{ color: Z2U.grey, fontSize: '18px', fontWeight: 700 }}>Loading Droppoint data...</p>
          <p style={{ color: Z2U.grey400, fontSize: '14px' }}>Connecting to Google Sheets</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (dataSource === 'error') {
    return (
      <div style={{ minHeight: '100vh', background: Z2U.grey50, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '40px' }}>
          <div style={{ background: `${Z2U.melon}15`, width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <AlertTriangle size={32} color={Z2U.melon} />
          </div>
          <p style={{ color: Z2U.grey, fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Could not load data</p>
          <p style={{ color: Z2U.grey400, fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>{loadError}</p>
          <button onClick={() => window.location.reload()} style={{ background: Z2U.blue, color: Z2U.white, border: 'none', borderRadius: '10px', padding: '12px 28px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={16} /> Try again
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER ─────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: Z2U.grey50, padding: '24px 32px', fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        input:focus, select:focus { border-color: ${Z2U.blue} !important; box-shadow: 0 0 0 3px ${Z2U.blue}20 !important; }
      `}</style>

      {popup && <DelayedBookingsPopup bookings={popup.bookings} title={popup.title} onClose={() => setPopup(null)} />}
      {activeDetail && <ActiveBookingDetail booking={activeDetail} onClose={() => setActiveDetail(null)} />}

      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: Z2U.grey, padding: '14px', borderRadius: '50%' }}><Truck size={28} color={Z2U.blue} strokeWidth={2.5} /></div>
          <div>
            <h1 style={{ color: Z2U.grey, fontSize: '28px', fontWeight: 800, margin: 0 }}>Droppoint Performance</h1>
            <p style={{ color: Z2U.grey400, fontSize: '14px', margin: '4px 0 0' }}>DIFOT Analytics Dashboard</p>
          </div>
        </div>

        {activeTab !== 'active' && (
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
        )}

        {activeTab === 'active' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `${Z2U.green}15`, padding: '10px 18px', borderRadius: '28px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: Z2U.green, animation: 'pulse 2s infinite' }} />
            <span style={{ color: '#4da832', fontSize: '13px', fontWeight: 700 }}>Live — {activeBookingsData.length} active deliveries</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { id: 'overview', label: 'Overview', icon: Package },
          { id: 'active', label: 'Active bookings', icon: Activity, badge: activeBookingsData.length },
          { id: 'history', label: 'Delivery history', icon: History },
          { id: 'speed', label: 'By Speed', icon: Zap },
          { id: 'pickup', label: 'By Pickup', icon: MapPin },
          { id: 'drivers', label: 'By Driver', icon: Users },
          { id: 'timing', label: 'Timing Analysis', icon: Timer },
          { id: 'time', label: 'Time of Day', icon: Calendar },
          { id: 'delays', label: 'Delays', icon: AlertTriangle }
        ].map(tab => (
          <TabButton key={tab.id} active={activeTab === tab.id} onClick={() => { setActiveTab(tab.id); setHistoryPage(1); }} icon={tab.icon} badge={tab.badge}>{tab.label}</TabButton>
        ))}
      </div>

      {/* ═══════════ ACTIVE BOOKINGS TAB ═══════════ */}
      {activeTab === 'active' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'Active', count: activeBookingsData.length, color: Z2U.blue, icon: Package },
              { label: 'In transit', count: activeBookingsData.filter(b => b.status === 'In transit').length, color: Z2U.blue, icon: Navigation },
              { label: 'Out for delivery', count: activeBookingsData.filter(b => b.status === 'Out for delivery').length, color: Z2U.green, icon: Truck },
              { label: 'Arriving soon', count: activeBookingsData.filter(b => b.status === 'Arriving soon').length, color: Z2U.green, icon: CheckCircle },
              { label: 'At risk', count: activeBookingsData.filter(b => b.is_at_risk).length, color: Z2U.yellow, icon: AlertTriangle },
            ].map(kpi => (
              <Card key={kpi.label} style={{ padding: '18px', textAlign: 'center' }}>
                <div style={{ background: `${kpi.color}15`, width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}><kpi.icon size={20} color={kpi.color} /></div>
                <p style={{ color: Z2U.grey, fontSize: '28px', fontWeight: 800, margin: '0 0 4px' }}>{kpi.count}</p>
                <p style={{ color: Z2U.grey400, fontSize: '12px', margin: 0, fontWeight: 600 }}>{kpi.label}</p>
              </Card>
            ))}
          </div>
          <Card style={{ marginBottom: '16px', padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={16} color={Z2U.grey400} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input type="text" placeholder="Search by reference, PO, or courier..." value={activeSearch} onChange={(e) => setActiveSearch(e.target.value)} style={{ width: '100%', padding: '10px 16px 10px 40px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <select value={activeStatusFilter} onChange={(e) => setActiveStatusFilter(e.target.value)} style={{ padding: '10px 16px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', fontSize: '13px', background: Z2U.white, fontWeight: 600, color: Z2U.grey }}>
                <option value="all">All statuses</option>
                {activeStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredActive.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '48px' }}><Package size={48} color={Z2U.grey300} style={{ marginBottom: '12px' }} /><p style={{ color: Z2U.grey, fontWeight: 700 }}>No active bookings found</p></Card>
            ) : filteredActive.map(booking => (
              <Card key={booking.booking_ref} style={{ padding: '0', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setActiveDetail(booking)}>
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: Z2U.blue, fontWeight: 800, fontSize: '15px' }}>{booking.booking_ref}</span>
                      <SpeedBadge speed={booking.speed} small />
                    </div>
                    <StatusBadge status={booking.status} isAtRisk={booking.is_at_risk} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '16px', alignItems: 'center', marginBottom: '14px' }}>
                    <div><p style={{ color: Z2U.grey400, fontSize: '11px', margin: '0 0 3px', textTransform: 'uppercase', fontWeight: 600 }}>Courier</p><p style={{ color: Z2U.grey, fontSize: '13px', fontWeight: 600, margin: 0 }}>{booking.courier}</p></div>
                    <div><p style={{ color: Z2U.grey400, fontSize: '11px', margin: '0 0 3px', textTransform: 'uppercase', fontWeight: 600 }}>Drop-off</p><p style={{ color: Z2U.grey, fontSize: '13px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{booking.drop_address}</p></div>
                    <div><p style={{ color: Z2U.grey400, fontSize: '11px', margin: '0 0 3px', textTransform: 'uppercase', fontWeight: 600 }}>ETA</p><p style={{ color: Z2U.grey, fontSize: '13px', fontWeight: 700, margin: 0 }}>{booking.eta}</p></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Eye size={16} color={Z2U.blue} /><span style={{ color: Z2U.blue, fontSize: '12px', fontWeight: 700 }}>Details</span></div>
                  </div>
                  <DeliveryProgress progress={booking.progress} isAtRisk={booking.is_at_risk} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ═══════════ DELIVERY HISTORY TAB ═══════════ */}
      {activeTab === 'history' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <KPICard title="Total deliveries" value={filteredData.length.toLocaleString()} subtitle={getPeriodLabel()} icon={Package} color={Z2U.grey} />
            <KPICard title="On time" value={stats.onTime.toLocaleString()} subtitle={`${((stats.onTime / (stats.total || 1)) * 100).toFixed(1)}% of total`} icon={CheckCircle} color={Z2U.green} />
            <KPICard title="Late" value={stats.late.toLocaleString()} subtitle="Click delays tab for breakdown" icon={XCircle} color={Z2U.melon} />
            <KPICard title="Avg delay" value={`${stats.lateBookings.length > 0 ? Math.round(stats.lateBookings.reduce((s, b) => s + b.overdue_mins, 0) / stats.lateBookings.length) : 0}m`} subtitle="Across late deliveries" icon={Clock} color={Z2U.yellow} />
          </div>

          <Card style={{ marginBottom: '16px', padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <Search size={16} color={Z2U.grey400} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input type="text" placeholder="Search reference, PO, courier, or address..." value={historySearch} onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }} style={{ width: '100%', padding: '10px 16px 10px 40px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <select value={historyStatusFilter} onChange={(e) => { setHistoryStatusFilter(e.target.value); setHistoryPage(1); }} style={{ padding: '10px 14px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', fontSize: '13px', background: Z2U.white, fontWeight: 600, color: Z2U.grey }}>
                <option value="all">All statuses</option><option value="on_time">On time</option><option value="late">Late</option>
              </select>
              <select value={historySpeedFilter} onChange={(e) => { setHistorySpeedFilter(e.target.value); setHistoryPage(1); }} style={{ padding: '10px 14px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', fontSize: '13px', background: Z2U.white, fontWeight: 600, color: Z2U.grey }}>
                <option value="all">All speeds</option><option value="VIP">VIP</option><option value="3 hour">3 hour</option><option value="Same day">Same day</option>
              </select>
              <select value={historyStateFilter} onChange={(e) => { setHistoryStateFilter(e.target.value); setHistoryPage(1); }} style={{ padding: '10px 14px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', fontSize: '13px', background: Z2U.white, fontWeight: 600, color: Z2U.grey }}>
                <option value="all">All states</option>
                {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={historySort} onChange={(e) => setHistorySort(e.target.value)} style={{ padding: '10px 14px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', fontSize: '13px', background: Z2U.white, fontWeight: 600, color: Z2U.grey }}>
                <option value="date">Sort by date</option><option value="ref">Sort by reference</option><option value="overdue">Sort by delay</option><option value="state">Sort by state</option>
              </select>
              <button onClick={() => setHistorySortDir(d => d === 'desc' ? 'asc' : 'desc')} style={{ padding: '10px 14px', border: `1px solid ${Z2U.grey200}`, borderRadius: '10px', background: Z2U.white, cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: Z2U.grey, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ArrowUpDown size={14} /> {historySortDir === 'desc' ? 'Desc' : 'Asc'}
              </button>
            </div>
            <p style={{ color: Z2U.grey400, fontSize: '12px', margin: '12px 0 0' }}>{historyData.totalCount.toLocaleString()} results — page {historyPage} of {historyData.totalPages || 1}</p>
          </Card>

          <Card style={{ padding: '0', overflow: 'hidden' }}>
            {historyData.paged.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px' }}>
                <Search size={48} color={Z2U.grey300} style={{ marginBottom: '12px' }} />
                <p style={{ color: Z2U.grey, fontWeight: 700 }}>No deliveries match your filters</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.7fr 0.5fr 0.6fr 0.5fr 0.5fr 0.5fr 0.5fr 40px', gap: '8px', padding: '14px 20px', borderBottom: `2px solid ${Z2U.grey200}`, background: Z2U.grey50 }}>
                  {['Reference', 'Date', 'Booked', 'Speed', 'SLA', 'State', 'Status', 'Delay', ''].map(h => (
                    <span key={h} style={{ color: Z2U.grey400, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>

                {historyData.paged.map(booking => {
                  const isExpanded = expandedHistoryRef === booking.booking_ref;
                  const isLate = !booking.on_time && booking.overdue_mins > 0;
                  return (
                    <div key={booking.booking_ref} style={{ borderBottom: `1px solid ${Z2U.grey100}` }}>
                      <div onClick={() => setExpandedHistoryRef(isExpanded ? null : booking.booking_ref)} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.7fr 0.5fr 0.6fr 0.5fr 0.5fr 0.5fr 0.5fr 40px', gap: '8px', padding: '14px 20px', cursor: 'pointer', background: isExpanded ? Z2U.grey50 : Z2U.white, alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: Z2U.blue, fontWeight: 700, fontSize: '13px' }}>{booking.booking_ref}</span>
                            {booking.notes.length > 0 && <span style={{ background: `${Z2U.yellow}30`, color: '#b8960a', padding: '1px 6px', borderRadius: '8px', fontSize: '9px', fontWeight: 700 }}>{booking.notes.length}</span>}
                          </div>
                          <span style={{ color: Z2U.grey400, fontSize: '11px' }}>PO: {booking.po}</span>
                        </div>
                        <span style={{ color: Z2U.grey, fontSize: '13px' }}>{booking.date}</span>
                        <span style={{ color: Z2U.grey, fontSize: '12px' }}>{booking.booking_time || formatHour(booking.hour)}</span>
                        <SpeedBadge speed={booking.speed} small />
                        <span style={{ color: Z2U.grey500, fontSize: '12px' }}>{booking.sla_minutes ? `${booking.sla_minutes}m` : '-'}</span>
                        <span style={{ color: Z2U.grey, fontSize: '13px', fontWeight: 600 }}>{booking.state}</span>
                        <div>
                          {!isLate ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4da832', fontSize: '12px', fontWeight: 700 }}><CheckCircle size={14} /> On time</span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: Z2U.melon, fontSize: '12px', fontWeight: 700 }}><XCircle size={14} /> Late</span>
                          )}
                        </div>
                        <div>
                          {isLate && <span style={{ background: booking.overdue_mins > 60 ? Z2U.melon : booking.overdue_mins > 30 ? Z2U.yellow : Z2U.blue, color: Z2U.white, padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>+{booking.overdue_mins}m</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isExpanded ? <ChevronUp size={16} color={Z2U.grey400} /> : <ChevronDown size={16} color={Z2U.grey400} />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: '16px 20px', background: Z2U.grey50, borderTop: `1px solid ${Z2U.grey200}` }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Courier</p><p style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600, margin: 0 }}>{booking.courier}</p></div>
                            <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Distance</p><p style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600, margin: 0 }}>{booking.distance}</p></div>
                            <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Expected SLA</p><p style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600, margin: 0 }}>{booking.sla_minutes ? fmtMins(booking.sla_minutes) : '-'}</p></div>
                            <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Booking → pickup</p><p style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600, margin: 0 }}>{booking.booking_to_pickup_mins ? fmtMins(booking.booking_to_pickup_mins) : '-'}</p></div>
                            <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Pickup → delivery</p><p style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600, margin: 0 }}>{booking.pickup_to_delivery_mins ? fmtMins(booking.pickup_to_delivery_mins) : '-'}</p></div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px', padding: '14px', background: Z2U.white, borderRadius: '10px', border: `1px solid ${Z2U.grey200}` }}>
                            <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Booked at</p><p style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600, margin: 0 }}>{booking.booking_time || formatHour(booking.hour)}</p></div>
                            <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Req. pickup</p><p style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600, margin: 0 }}>{booking.requested_pickup_time || '-'}</p></div>
                            <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Actual pickup</p><p style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600, margin: 0 }}>{booking.actual_pickup_time || '-'}</p></div>
                            <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Expected delivery</p><p style={{ color: Z2U.grey, fontSize: '14px', fontWeight: 600, margin: 0 }}>{booking.expected_delivery_time || '-'}</p></div>
                            <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Delivered at</p><p style={{ color: isLate ? Z2U.melon : '#4da832', fontSize: '14px', fontWeight: 700, margin: 0 }}>{booking.actual_delivery_time || '-'} {isLate && <span style={{ fontSize: '11px' }}>(+{booking.overdue_mins}m)</span>}</p></div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: booking.notes.length > 0 ? '16px' : '0' }}>
                            <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Pickup address</p><p style={{ color: Z2U.grey, fontSize: '13px', margin: 0 }}>{booking.pickup_address}</p></div>
                            <div><p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Drop-off address</p><p style={{ color: Z2U.grey, fontSize: '13px', margin: 0 }}>{booking.drop_address}</p></div>
                          </div>
                          {booking.notes.length > 0 && (
                            <div style={{ padding: '14px', background: Z2U.white, borderRadius: '10px', border: `1px solid ${Z2U.grey200}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                                <FileText size={14} color={Z2U.blue} /><span style={{ color: Z2U.blue, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Notes ({booking.notes.length})</span>
                              </div>
                              {booking.notes.map((note, i) => (
                                <div key={i} style={{ padding: '8px 10px', background: Z2U.grey50, borderRadius: '8px', borderLeft: `3px solid ${Z2U.blue}`, marginBottom: i < booking.notes.length - 1 ? '6px' : 0 }}>
                                  <p style={{ color: Z2U.grey, fontSize: '12px', margin: 0, lineHeight: 1.5 }}>{note}</p>
                                </div>
                              ))}
                            </div>
                          )}
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
                    <button disabled={historyPage <= 1} onClick={() => setHistoryPage(p => p - 1)} style={{ padding: '8px 14px', border: `1px solid ${Z2U.grey200}`, borderRadius: '8px', background: Z2U.white, cursor: historyPage <= 1 ? 'not-allowed' : 'pointer', opacity: historyPage <= 1 ? 0.4 : 1, fontSize: '13px', fontWeight: 600, color: Z2U.grey, display: 'flex', alignItems: 'center', gap: '4px' }}><ChevronLeft size={14} /> Previous</button>
                    {Array.from({ length: Math.min(5, historyData.totalPages) }, (_, i) => {
                      let page;
                      if (historyData.totalPages <= 5) page = i + 1;
                      else if (historyPage <= 3) page = i + 1;
                      else if (historyPage >= historyData.totalPages - 2) page = historyData.totalPages - 4 + i;
                      else page = historyPage - 2 + i;
                      return (
                        <button key={page} onClick={() => setHistoryPage(page)} style={{ padding: '8px 12px', border: page === historyPage ? 'none' : `1px solid ${Z2U.grey200}`, borderRadius: '8px', background: page === historyPage ? Z2U.blue : Z2U.white, color: page === historyPage ? Z2U.white : Z2U.grey, cursor: 'pointer', fontSize: '13px', fontWeight: 700, minWidth: '38px' }}>{page}</button>
                      );
                    })}
                    <button disabled={historyPage >= historyData.totalPages} onClick={() => setHistoryPage(p => p + 1)} style={{ padding: '8px 14px', border: `1px solid ${Z2U.grey200}`, borderRadius: '8px', background: Z2U.white, cursor: historyPage >= historyData.totalPages ? 'not-allowed' : 'pointer', opacity: historyPage >= historyData.totalPages ? 0.4 : 1, fontSize: '13px', fontWeight: 600, color: Z2U.grey, display: 'flex', alignItems: 'center', gap: '4px' }}>Next <ChevronRight size={14} /></button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ═══════════ MAIN CONTENT TABS ═══════════ */}
      {stats.total === 0 && !['active', 'history'].includes(activeTab) ? (
        <Card style={{ textAlign: 'center', padding: '60px' }}><Package size={48} color={Z2U.grey300} style={{ marginBottom: '16px' }} /><h3 style={{ color: Z2U.grey }}>No data for this period</h3><p style={{ color: Z2U.grey400 }}>Try selecting a different date range</p></Card>
      ) : (
        <>
          {/* ═══════════ OVERVIEW TAB ═══════════ */}
          {activeTab === 'overview' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <KPICard title="Total bookings" value={stats.total.toLocaleString()} subtitle="In selected period" icon={Package} color={Z2U.grey} />
                <KPICard title="Overall DIFOT" value={`${stats.difot}%`} subtitle="Delivered in full on time" icon={Clock} color={Z2U.blue} />
                <KPICard title="On time" value={stats.onTime.toLocaleString()} subtitle={`${((stats.onTime / (stats.total || 1)) * 100).toFixed(1)}% success`} icon={CheckCircle} color={Z2U.green} />
                <KPICard title="Late deliveries" value={stats.late.toLocaleString()} subtitle={`Click to view ${stats.lateBookings.length} late →`} icon={XCircle} color={Z2U.melon} onClick={() => { if (stats.lateBookings.length > 0) setPopup({ bookings: stats.lateBookings, title: 'All late deliveries' }); }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <Card>
                  <SectionHeader title="DIFOT by state" subtitle="Click bar to view delayed bookings" />
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.stateData} layout="vertical" onClick={(e) => { if (e?.activePayload?.[0]?.payload?.lateBookings?.length > 0) setPopup({ bookings: e.activePayload[0].payload.lateBookings, title: `Late deliveries — ${e.activePayload[0].payload.State}` }); }}>
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
                  <SectionHeader title="Delivery status" />
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
                <SectionHeader title="State performance details" subtitle="Click late count to view bookings" />
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${Z2U.grey200}` }}>
                      {['State', 'Total', 'On time', 'Late', 'DIFOT'].map(h => (
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
                          <span onClick={() => { if (row.lateBookings.length > 0) setPopup({ bookings: row.lateBookings, title: `Late deliveries — ${row.State}` }); }} style={{ color: Z2U.melon, fontWeight: 600, cursor: row.lateBookings.length > 0 ? 'pointer' : 'default', textDecoration: row.lateBookings.length > 0 ? 'underline' : 'none' }}>{row.late_count.toLocaleString()}</span>
                        </td>
                        <td style={{ padding: '14px 12px' }}><ProgressBar value={row.difot_pct} color={getColorForDifot(row.difot_pct)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}

          {/* ═══════════ BY PICKUP LOCATION TAB ═══════════ */}
          {activeTab === 'pickup' && (
            <>
              <SectionHeader title="Performance by pickup location" subtitle="Breakdown by origin — Fuji locations highlighted" />
              {/* Fuji summary if applicable */}
              {stats.pickupData.some(p => p.isFuji) && (
                <Card style={{ marginBottom: '24px', borderLeft: `4px solid ${Z2U.blue}` }}>
                  <SectionHeader title="Fuji locations summary" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    {(() => {
                      const fuji = stats.pickupData.filter(p => p.isFuji);
                      const totalF = fuji.reduce((s, p) => s + p.total, 0);
                      const onTimeF = fuji.reduce((s, p) => s + p.on_time, 0);
                      const lateF = totalF - onTimeF;
                      const avgBTP = fuji.reduce((s, p) => s + p.avg_booking_to_pickup * p.total, 0) / (totalF || 1);
                      return [
                        { label: 'Total Fuji bookings', val: totalF.toLocaleString(), color: Z2U.blue },
                        { label: 'Fuji DIFOT', val: `${((onTimeF / (totalF || 1)) * 100).toFixed(1)}%`, color: getColorForDifot((onTimeF / (totalF || 1)) * 100) },
                        { label: 'Fuji late', val: lateF.toLocaleString(), color: Z2U.melon },
                        { label: 'Avg booking → pickup', val: `${Math.round(avgBTP)}m`, color: Z2U.grey },
                      ].map(k => (
                        <div key={k.label} style={{ textAlign: 'center' }}>
                          <p style={{ color: Z2U.grey400, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 600 }}>{k.label}</p>
                          <p style={{ color: k.color, fontSize: '28px', fontWeight: 800, margin: 0 }}>{k.val}</p>
                        </div>
                      ));
                    })()}
                  </div>
                </Card>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {stats.pickupData.map(loc => (
                  <Card key={loc.location} style={{ borderLeft: loc.isFuji ? `4px solid ${Z2U.blue}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <MapPin size={16} color={loc.isFuji ? Z2U.blue : Z2U.grey400} />
                          <span style={{ color: Z2U.grey, fontSize: '15px', fontWeight: 700 }}>{loc.location}</span>
                          {loc.isFuji && <span style={{ background: `${Z2U.blue}15`, color: Z2U.blue, padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>Fuji</span>}
                        </div>
                      </div>
                      <ProgressBar value={loc.difot_pct} color={getColorForDifot(loc.difot_pct)} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
                      <div style={{ textAlign: 'center' }}><p style={{ color: Z2U.grey400, fontSize: '10px', textTransform: 'uppercase', margin: '0 0 4px' }}>Total</p><p style={{ color: Z2U.grey, fontSize: '20px', fontWeight: 800, margin: 0 }}>{loc.total.toLocaleString()}</p></div>
                      <div style={{ textAlign: 'center' }}><p style={{ color: Z2U.grey400, fontSize: '10px', textTransform: 'uppercase', margin: '0 0 4px' }}>On time</p><p style={{ color: Z2U.green, fontSize: '20px', fontWeight: 800, margin: 0 }}>{loc.on_time.toLocaleString()}</p></div>
                      <div style={{ textAlign: 'center', cursor: loc.lateBookings.length > 0 ? 'pointer' : 'default' }} onClick={() => { if (loc.lateBookings.length > 0) setPopup({ bookings: loc.lateBookings, title: `Late deliveries — ${loc.location}` }); }}>
                        <p style={{ color: Z2U.grey400, fontSize: '10px', textTransform: 'uppercase', margin: '0 0 4px' }}>Late</p>
                        <p style={{ color: Z2U.melon, fontSize: '20px', fontWeight: 800, margin: 0, textDecoration: loc.lateBookings.length > 0 ? 'underline' : 'none' }}>{loc.late.toLocaleString()}</p>
                      </div>
                      <div style={{ textAlign: 'center' }}><p style={{ color: Z2U.grey400, fontSize: '10px', textTransform: 'uppercase', margin: '0 0 4px' }}>DIFOT</p><p style={{ color: getColorForDifot(loc.difot_pct), fontSize: '20px', fontWeight: 800, margin: 0 }}>{loc.difot_pct}%</p></div>
                      <div style={{ textAlign: 'center' }}><p style={{ color: Z2U.grey400, fontSize: '10px', textTransform: 'uppercase', margin: '0 0 4px' }}>Avg book→pick</p><p style={{ color: Z2U.grey, fontSize: '20px', fontWeight: 800, margin: 0 }}>{loc.avg_booking_to_pickup}m</p></div>
                      <div style={{ textAlign: 'center' }}><p style={{ color: Z2U.grey400, fontSize: '10px', textTransform: 'uppercase', margin: '0 0 4px' }}>Avg pick→del</p><p style={{ color: Z2U.grey, fontSize: '20px', fontWeight: 800, margin: 0 }}>{loc.avg_pickup_to_delivery}m</p></div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* ═══════════ BY DRIVER TAB ═══════════ */}
          {activeTab === 'drivers' && (
            <>
              <SectionHeader title="Late analysis by driver" subtitle="Click late count to view individual bookings" />
              <Card style={{ marginBottom: '24px' }}>
                <SectionHeader title="Driver DIFOT ranking" />
                <ResponsiveContainer width="100%" height={Math.max(280, stats.driverData.length * 40)}>
                  <BarChart data={stats.driverData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={Z2U.grey200} />
                    <XAxis type="number" domain={[0, 100]} stroke={Z2U.grey300} fontSize={11} tickFormatter={v => `${v}%`} />
                    <YAxis dataKey="name" type="category" stroke={Z2U.grey300} fontSize={12} width={120} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="difot_pct" name="DIFOT %" radius={[0, 8, 8, 0]}>
                      {stats.driverData.map((entry, i) => <Cell key={i} fill={getColorForDifot(entry.difot_pct)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr repeat(7, 1fr)', gap: '8px', padding: '14px 20px', borderBottom: `2px solid ${Z2U.grey200}`, background: Z2U.grey50 }}>
                  {['Driver', 'Total', 'On time', 'Late', 'DIFOT', 'Avg delay', 'Avg book→pick', 'Avg pick→del'].map(h => (
                    <span key={h} style={{ color: Z2U.grey400, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>
                {stats.driverData.map(d => (
                  <div key={d.name} style={{ display: 'grid', gridTemplateColumns: '1.2fr repeat(7, 1fr)', gap: '8px', padding: '14px 20px', borderBottom: `1px solid ${Z2U.grey100}`, alignItems: 'center' }}>
                    <span style={{ color: Z2U.grey, fontWeight: 700, fontSize: '14px' }}>{d.name}</span>
                    <span style={{ color: Z2U.grey500, fontSize: '14px' }}>{d.total.toLocaleString()}</span>
                    <span style={{ color: Z2U.green, fontWeight: 600 }}>{d.on_time.toLocaleString()}</span>
                    <span onClick={() => { if (d.lateBookings.length > 0) setPopup({ bookings: d.lateBookings, title: `Late deliveries — ${d.name}` }); }} style={{ color: Z2U.melon, fontWeight: 600, cursor: d.lateBookings.length > 0 ? 'pointer' : 'default', textDecoration: d.lateBookings.length > 0 ? 'underline' : 'none' }}>{d.late.toLocaleString()}</span>
                    <span style={{ color: getColorForDifot(d.difot_pct), fontWeight: 700 }}>{d.difot_pct}%</span>
                    <span style={{ color: d.avg_delay > 60 ? Z2U.melon : d.avg_delay > 30 ? Z2U.yellow : Z2U.grey500, fontWeight: 600 }}>{d.avg_delay > 0 ? fmtMins(d.avg_delay) : '-'}</span>
                    <span style={{ color: Z2U.grey500 }}>{d.avg_booking_to_pickup}m</span>
                    <span style={{ color: Z2U.grey500 }}>{d.avg_pickup_to_delivery}m</span>
                  </div>
                ))}
              </Card>
            </>
          )}

          {/* ═══════════ TIMING ANALYSIS TAB ═══════════ */}
          {activeTab === 'timing' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <KPICard title="Avg booking → pickup" value={fmtMins(stats.avgBookingToPickup)} subtitle="Time until courier collects" icon={Timer} color={Z2U.blue} />
                <KPICard title="Avg pickup → delivery" value={fmtMins(stats.avgPickupToDelivery)} subtitle="Transit time to customer" icon={Truck} color={Z2U.green} />
                <KPICard title="Avg total time" value={fmtMins(stats.avgBookingToPickup + stats.avgPickupToDelivery)} subtitle="Booking to delivery" icon={Clock} color={Z2U.grey} />
                <KPICard title="Overall DIFOT" value={`${stats.difot}%`} subtitle="On time delivery rate" icon={TrendingUp} color={getColorForDifot(parseFloat(stats.difot))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <Card>
                  <SectionHeader title="Booking → pickup distribution" subtitle="How long until couriers collect" />
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stats.btpData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={Z2U.grey200} />
                      <XAxis dataKey="bucket" stroke={Z2U.grey300} fontSize={11} />
                      <YAxis stroke={Z2U.grey300} fontSize={11} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Bookings" fill={Z2U.blue} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                <Card>
                  <SectionHeader title="Avg pickup → delivery by speed" subtitle="Transit time varies by service level" />
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stats.ptdSpeedData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={Z2U.grey200} />
                      <XAxis dataKey="speed" stroke={Z2U.grey300} fontSize={12} />
                      <YAxis stroke={Z2U.grey300} fontSize={11} tickFormatter={v => `${v}m`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="avg" name="Avg minutes" radius={[8, 8, 0, 0]}>
                        {stats.ptdSpeedData.map((entry, i) => (
                          <Cell key={i} fill={entry.speed === 'VIP' ? Z2U.melon : entry.speed === '3 hour' ? Z2U.blue : Z2U.green} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <Card style={{ marginBottom: '24px' }}>
                <SectionHeader title="Does pickup speed affect DIFOT?" subtitle="DIFOT rate by booking-to-pickup time" />
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.btpCorrelation}>
                    <CartesianGrid strokeDasharray="3 3" stroke={Z2U.grey200} />
                    <XAxis dataKey="range" stroke={Z2U.grey300} fontSize={12} />
                    <YAxis stroke={Z2U.grey300} fontSize={11} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="difotPct" name="DIFOT %" radius={[8, 8, 0, 0]}>
                      {stats.btpCorrelation.map((entry, i) => <Cell key={i} fill={getColorForDifot(entry.difotPct)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <SectionHeader title="Timing by driver" subtitle="Average times per courier" />
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr repeat(4, 1fr)', gap: '8px', padding: '14px 20px', borderBottom: `2px solid ${Z2U.grey200}`, background: Z2U.grey50 }}>
                  {['Driver', 'Avg book→pick', 'Avg pick→del', 'Avg total', 'DIFOT'].map(h => (
                    <span key={h} style={{ color: Z2U.grey400, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>
                {stats.driverData.map(d => (
                  <div key={d.name} style={{ display: 'grid', gridTemplateColumns: '1.2fr repeat(4, 1fr)', gap: '8px', padding: '14px 20px', borderBottom: `1px solid ${Z2U.grey100}`, alignItems: 'center' }}>
                    <span style={{ color: Z2U.grey, fontWeight: 700 }}>{d.name}</span>
                    <span style={{ color: Z2U.grey500 }}>{fmtMins(d.avg_booking_to_pickup)}</span>
                    <span style={{ color: Z2U.grey500 }}>{fmtMins(d.avg_pickup_to_delivery)}</span>
                    <span style={{ color: Z2U.grey500 }}>{fmtMins(d.avg_booking_to_pickup + d.avg_pickup_to_delivery)}</span>
                    <ProgressBar value={d.difot_pct} color={getColorForDifot(d.difot_pct)} />
                  </div>
                ))}
              </Card>
            </>
          )}

          {/* ═══════════ SPEED TAB ═══════════ */}
          {activeTab === 'speed' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {stats.speedData.map(speed => {
                  const col = speed.DeliverySpeed === 'VIP' ? Z2U.melon : speed.DeliverySpeed === '3 hour' ? Z2U.blue : Z2U.green;
                  return (
                    <Card key={speed.DeliverySpeed} style={{ borderTop: `4px solid ${col}`, cursor: 'pointer' }} onClick={() => { if (speed.lateBookings.length > 0) setPopup({ bookings: speed.lateBookings, title: `Late deliveries — ${speed.DeliverySpeed}` }); }}>
                      <div style={{ background: col, color: Z2U.white, padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, display: 'inline-block', marginBottom: '14px' }}>{speed.DeliverySpeed.toUpperCase()}</div>
                      <p style={{ color: Z2U.grey, fontSize: '44px', fontWeight: 800, margin: '0 0 8px' }}>{speed.difot_pct}%</p>
                      <p style={{ color: Z2U.grey400, fontSize: '13px', margin: 0 }}>{speed.on_time_count.toLocaleString()} / {speed.total.toLocaleString()} deliveries</p>
                      {speed.lateBookings.length > 0 && <p style={{ color: Z2U.melon, fontSize: '12px', marginTop: '8px' }}>Click to view {speed.lateBookings.length} late →</p>}
                    </Card>
                  );
                })}
              </div>
              <Card>
                <SectionHeader title="Performance by distance" subtitle="Click to view late bookings" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {stats.distanceData.map(d => (
                    <div key={d.distance_category} onClick={() => { if (d.lateBookings.length > 0) setPopup({ bookings: d.lateBookings, title: `Late deliveries — ${d.distance_category}` }); }} style={{ background: Z2U.grey50, borderRadius: '16px', padding: '20px', border: `1px solid ${Z2U.grey200}`, cursor: d.lateBookings.length > 0 ? 'pointer' : 'default' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <span style={{ color: Z2U.blue, fontWeight: 700 }}>{d.distance_category}</span>
                        <span style={{ color: getColorForDifot(d.difot_pct), fontWeight: 700 }}>{d.difot_pct}%</span>
                      </div>
                      <p style={{ color: Z2U.grey, fontSize: '24px', fontWeight: 800, margin: '0 0 6px' }}>{d.total.toLocaleString()}</p>
                      {d.lateBookings.length > 0 && <p style={{ color: Z2U.melon, fontSize: '12px' }}>{d.lateBookings.length} late — click to view →</p>}
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* ═══════════ TIME OF DAY TAB ═══════════ */}
          {activeTab === 'time' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Card>
                <SectionHeader title="DIFOT by day of week" />
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
                <SectionHeader title="DIFOT by hour" />
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={stats.hourData}>
                    <defs><linearGradient id="cH" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={Z2U.blue} stopOpacity={0.3} /><stop offset="95%" stopColor={Z2U.blue} stopOpacity={0} /></linearGradient></defs>
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

          {/* ═══════════ DELAYS TAB ═══════════ */}
          {activeTab === 'delays' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {overdueChartData.map(item => {
                  const col = item.name === '2+ hours' ? Z2U.melon : item.name === '1-2 hours' ? Z2U.yellow : Z2U.blue;
                  return (
                    <Card key={item.name} style={{ textAlign: 'center', borderTop: `3px solid ${col}`, cursor: item.bookings.length > 0 ? 'pointer' : 'default' }} onClick={() => { if (item.bookings.length > 0) setPopup({ bookings: item.bookings, title: `Late deliveries — ${item.name}` }); }}>
                      <p style={{ color: Z2U.grey400, fontSize: '11px', marginBottom: '10px', textTransform: 'uppercase', fontWeight: 700 }}>{item.name}</p>
                      <p style={{ color: Z2U.grey, fontSize: '30px', fontWeight: 800, margin: '0 0 6px' }}>{item.value.toLocaleString()}</p>
                      {item.bookings.length > 0 && <p style={{ color: col, fontSize: '11px' }}>Click to view →</p>}
                    </Card>
                  );
                })}
              </div>
              <Card style={{ marginBottom: '24px' }}>
                <SectionHeader title="Delays by distance" subtitle="Click card to view delayed bookings" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {stats.delaysByDistance.map(dist => (
                    <div key={dist.distance} onClick={() => { if (dist.lateBookings.length > 0) setPopup({ bookings: dist.lateBookings, title: `Late deliveries — ${dist.distance}` }); }} style={{ background: Z2U.grey50, borderRadius: '16px', padding: '20px', border: `1px solid ${Z2U.grey200}`, cursor: dist.lateBookings.length > 0 ? 'pointer' : 'default' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <span style={{ color: Z2U.grey, fontWeight: 700 }}>{dist.distance}</span>
                        <span style={{ background: dist.avg_overdue > 60 ? Z2U.melon : dist.avg_overdue > 30 ? Z2U.yellow : Z2U.blue, color: Z2U.white, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>Avg {dist.avg_overdue}m</span>
                      </div>
                      <p style={{ color: Z2U.grey, fontSize: '28px', fontWeight: 800, margin: '0 0 12px' }}>{dist.total_late.toLocaleString()} <span style={{ fontSize: '14px', color: Z2U.grey400 }}>delays</span></p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {[{ label: 'Minor', count: dist.minor, color: Z2U.blue, bg: `${Z2U.blue}15` }, { label: 'Moderate', count: dist.moderate, color: '#b8960a', bg: `${Z2U.yellow}15` }, { label: 'Critical', count: dist.critical, color: Z2U.melon, bg: `${Z2U.melon}15` }].map(c => (
                          <div key={c.label} style={{ flex: 1, textAlign: 'center', padding: '8px', background: c.bg, borderRadius: '8px' }}>
                            <p style={{ color: c.color, fontSize: '16px', fontWeight: 700, margin: 0 }}>{c.count}</p>
                            <p style={{ color: Z2U.grey400, fontSize: '10px', margin: '2px 0 0' }}>{c.label}</p>
                          </div>
                        ))}
                      </div>
                      {dist.lateBookings.length > 0 && <p style={{ color: Z2U.blue, fontSize: '11px', marginTop: '12px', textAlign: 'center' }}>Click to view all →</p>}
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <SectionHeader title="Delay severity" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {[
                    { label: 'Critical (1hr+)', color: Z2U.melon, icon: XCircle, bookings: [...stats.overdueData['1-2 hours'], ...stats.overdueData['2+ hours']] },
                    { label: 'Moderate (31-60m)', color: Z2U.yellow, icon: AlertTriangle, bookings: stats.overdueData['31-60 mins'] },
                    { label: 'Minor (<30m)', color: Z2U.blue, icon: Clock, bookings: [...stats.overdueData['1-15 mins'], ...stats.overdueData['16-30 mins']] }
                  ].map(cat => (
                    <div key={cat.label} onClick={() => { if (cat.bookings.length > 0) setPopup({ bookings: cat.bookings, title: `Late deliveries — ${cat.label}` }); }} style={{ background: `${cat.color}12`, border: `1px solid ${cat.color}30`, borderRadius: '16px', padding: '20px', cursor: cat.bookings.length > 0 ? 'pointer' : 'default' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <cat.icon size={18} color={cat.color} />
                        <span style={{ color: cat.color, fontWeight: 700, fontSize: '13px' }}>{cat.label}</span>
                      </div>
                      <p style={{ color: Z2U.grey, fontSize: '32px', fontWeight: 800, margin: '0 0 6px' }}>{cat.bookings.length.toLocaleString()}</p>
                      {cat.bookings.length > 0 && <p style={{ color: cat.color, fontSize: '11px' }}>Click to view details →</p>}
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
          {activeTab === 'active' ? `${activeBookingsData.length} active deliveries` : `Showing ${stats.total.toLocaleString()} bookings for ${getPeriodLabel()}`}
        </p>
      </div>
    </div>
  );
}

// Helper for BTP correlation
function calcCorr(bookings) {
  if (bookings.length === 0) return { total: 0, difotPct: 0 };
  const onTime = bookings.filter(b => b.on_time || b.overdue_mins === 0).length;
  return { total: bookings.length, difotPct: parseFloat(((onTime / bookings.length) * 100).toFixed(1)) };
}
