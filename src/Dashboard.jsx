import { useState, useMemo, useEffect, useCallback } from "react";
import { useDeliveryData } from "./useDeliveryData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Package, Clock, CheckCircle, XCircle, TrendingUp, Truck, MapPin, Users, AlertTriangle, FileText, ChevronLeft, ChevronRight, X, Search, Plus, Filter } from "lucide-react";

// ─── Compressed delivery data (from spreadsheet) ───
// Data is now fetched from Supabase via useDeliveryData hook

// ─── Data Processing ───
// Data expansion is now handled in useDeliveryData.js


function formatTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + formatTime(isoStr);
}

function formatDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMins(mins) {
  if (mins === null || mins === undefined || isNaN(mins)) return '—';
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.round(Math.abs(mins) % 60);
  const sign = mins < 0 ? '-' : '+';
  if (h === 0) return `${sign}${m}m`;
  return `${sign}${h}h ${m}m`;
}

function formatSLA(mins) {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}


// ─── Color Palette (Zoom2u) ───
const Z2U = {
  grey: '#4B5054',
  blue: '#00A7E2',
  melon: '#FD5373',
  green: '#76D750',
  yellow: '#FFD100',
  lightGrey: '#F5F6F7',
  medGrey: '#E8EAEB',
  white: '#FFFFFF',
};

const LATE_REASONS = [
  'Allocation Issues – Driver',
  'No PPE – Driver',
  'Poor Time Management – Driver',
  'Traffic/Parking',
  'FBAU Requested Change of Address/ETA/SLA',
  'Missing or Incorrect Order Details',
  'Driver Held Up at Delivery Site',
  'Delayed Departure from Pickup Site',
  'Delivery Rejected / Driver Access Issues',
  'Damaged on Dispatch',
  'Delay at Pickup',
  'Booking Request Cancelled',
  'Late Booking Request',
  'FBAU System Issue (Incl DBS)',
  'Force Majeure',
  'Labelling Error',
  'Public Holiday',
  'Weather Delay',
  'Traffic Incident',
];

const LATE_REASON_DESCRIPTIONS = {
  'Allocation Issues – Driver': 'Driver allocation delay, capacity/availability, collected multiple jobs, IT issues.',
  'No PPE – Driver': 'Driver refused entry at collection point – no PPE.',
  'Poor Time Management – Driver': 'Driver took longer than required at individual stops without operational justification.',
  'Traffic/Parking': 'Regular traffic or parking issues — not driver fault but not force majeure. Applies to deliveries <10 min late and >20 km.',
  'FBAU Requested Change of Address/ETA/SLA': 'FBAU requested a change of address, updated ETA, or updated SLA.',
  'Missing or Incorrect Order Details': 'Incorrect information on consignment resulting in incorrect, inaccurate, or delayed delivery.',
  'Driver Held Up at Delivery Site': 'Driver held up or left waiting at handover point for receiver.',
  'Delayed Departure from Pickup Site': 'Driver delayed or held up at pickup location resulting in late delivery.',
  'Delivery Rejected / Driver Access Issues': 'Driver experienced issues at delivery point such as security restrictions, receiver unavailable, or access constraints.',
  'Damaged on Dispatch': 'Damaged by FBAU or DBS during processing.',
  'Delay at Pickup': 'Relating to FBAU or DBS delays in handover to Droppoint.',
  'Booking Request Cancelled': 'Booking request cancelled by FBAU team.',
  'Late Booking Request': 'Booking request lodged outside of agreed operating hours.',
  'FBAU System Issue (Incl DBS)': 'Systems failure relating to FBAU and/or DBS systems.',
  'Force Majeure': 'Fire, flood, terrorism, earthquake, public health warning, severe storm/cyclone.',
  'Labelling Error': 'Incorrect, missing, or damaged labels affixed to consignment.',
  'Public Holiday': 'National or state-based public holiday delaying pickup or dispatch.',
  'Weather Delay': 'Weather-related delay not considered a natural disaster but still impacting delivery timeframes.',
  'Traffic Incident': 'Incidents outside regular traffic hazards impacting the ability to meet delivery timeframes.',
};

const LATE_REASON_STATUS = {
  'Allocation Issues – Driver': 'Controllable',
  'No PPE – Driver': 'Controllable',
  'Poor Time Management – Driver': 'Controllable',
  'Traffic/Parking': 'Controllable',
  'FBAU Requested Change of Address/ETA/SLA': 'Uncontrollable',
  'Missing or Incorrect Order Details': 'Uncontrollable',
  'Driver Held Up at Delivery Site': 'Uncontrollable',
  'Delayed Departure from Pickup Site': 'Uncontrollable',
  'Delivery Rejected / Driver Access Issues': 'Uncontrollable',
  'Damaged on Dispatch': 'Uncontrollable',
  'Delay at Pickup': 'Uncontrollable',
  'Booking Request Cancelled': 'Uncontrollable',
  'Late Booking Request': 'Uncontrollable',
  'FBAU System Issue (Incl DBS)': 'Uncontrollable',
  'Force Majeure': 'Uncontrollable',
  'Labelling Error': 'Uncontrollable',
  'Public Holiday': 'Uncontrollable',
  'Weather Delay': 'Uncontrollable',
  'Traffic Incident': 'Uncontrollable',
};

// ─── Components ───

function StatCard({ icon: Icon, label, value, sub, color = Z2U.blue }) {
  return (
    <div style={{ background: Z2U.white, borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${Z2U.medGrey}`, flex: 1, minWidth: 180 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: Z2U.grey, lineHeight: 1.1 }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} color={color} />
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, label, onClick, badge }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 20px', borderRadius: 24, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
      background: active ? Z2U.blue : Z2U.white, color: active ? Z2U.white : Z2U.grey,
      boxShadow: active ? '0 2px 8px rgba(0,167,226,0.3)' : '0 1px 2px rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', whiteSpace: 'nowrap',
    }}>
      {label}
      {badge !== undefined && badge > 0 && (
        <span style={{ background: active ? Z2U.white : Z2U.melon, color: active ? Z2U.blue : Z2U.white, borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{badge}</span>
      )}
    </button>
  );
}

function CustomerToggle({ value, onChange }) {
  const opts = ['All', 'Fuji', 'Droppoint'];
  return (
    <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: `1px solid ${Z2U.medGrey}` }}>
      {opts.map(o => (
        <button key={o} onClick={() => onChange(o)} style={{
          padding: '7px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          background: value === o ? Z2U.grey : Z2U.white, color: value === o ? Z2U.white : Z2U.grey,
          transition: 'all 0.15s',
        }}>{o}</button>
      ))}
    </div>
  );
}

function MonthNavigator({ allData, period, currentDate, onPeriodChange, onDateChange }) {
  const getLabel = () => {
    const d = new Date(currentDate);
    if (period === 'Day') return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    if (period === 'Week') {
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay() + 1); // Monday
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    if (period === 'Month') return d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
    if (period === 'Year') return d.getFullYear().toString();
    return '';
  };

  const navigate = (direction) => {
    const d = new Date(currentDate);
    if (period === 'Day') d.setDate(d.getDate() + direction);
    else if (period === 'Week') d.setDate(d.getDate() + (7 * direction));
    else if (period === 'Month') d.setMonth(d.getMonth() + direction);
    else if (period === 'Year') d.setFullYear(d.getFullYear() + direction);
    onDateChange(d.toISOString().split('T')[0]);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: `1px solid ${Z2U.medGrey}` }}>
        {['Day','Week','Month','Year'].map(p => (
          <button key={p} onClick={() => onPeriodChange(p)} style={{
            padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: p === period ? Z2U.grey : Z2U.white, color: p === period ? Z2U.white : Z2U.grey,
            transition: 'all 0.15s',
          }}>{p}</button>
        ))}
      </div>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
        <ChevronLeft size={18} color={Z2U.grey} />
      </button>
      <span style={{ fontSize: 14, fontWeight: 600, color: Z2U.grey, minWidth: 180, textAlign: 'center' }}>{getLabel()}</span>
      <button onClick={() => navigate(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
        <ChevronRight size={18} color={Z2U.grey} />
      </button>
    </div>
  );
}

function filterByPeriod(data, period, currentDate) {
  const d = new Date(currentDate + 'T12:00:00'); // noon to avoid timezone edge issues
  return data.filter(item => {
    // Use requested pickup date for grouping (delivery day), fall back to booking date
    const dateStr = item.requestedPickup || item.requestedDrop || item.date;
    if (!dateStr) return false;
    const itemDate = new Date(dateStr);
    
    // Compare using local date parts (AEST) not UTC
    const itemDay = itemDate.getDate();
    const itemMonth = itemDate.getMonth();
    const itemYear = itemDate.getFullYear();
    const itemDayOfWeek = itemDate.getDay();
    
    if (period === 'Day') {
      return itemDay === d.getDate() && itemMonth === d.getMonth() && itemYear === d.getFullYear();
    }
    if (period === 'Week') {
      const start = new Date(d);
      start.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
      start.setHours(0,0,0,0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23,59,59,999);
      return itemDate >= start && itemDate <= end;
    }
    if (period === 'Month') {
      return itemYear === d.getFullYear() && itemMonth === d.getMonth();
    }
    if (period === 'Year') {
      return itemYear === d.getFullYear();
    }
    return true;
  });
}

// ─── Booking Detail Modal ───
function BookingModal({ booking, notes, onClose, onAddNote, onAssignReason, onDeleteNote }) {
  const [newNote, setNewNote] = useState('');
  const [authorName, setAuthorName] = useState(() => {
    try { return localStorage.getItem('droppoint-author-name') || ''; } catch(e) { return ''; }
  });
  const [showReasons, setShowReasons] = useState(false);
  if (!booking) return null;
  
  const b = booking;
  const reqPickup = b.requestedPickup ? new Date(b.requestedPickup) : null;
  const actualDrop = b.dropActual ? new Date(b.dropActual) : null;
  const expectedDel = b.expectedDelivery;
  
  const bookingNotes = notes.filter(n => n.bookingRef === b.bookingRef);
  const isMarkedNotLate = bookingNotes.some(n => n.note === 'Marked as Not Late');
  const lateReasonNote = bookingNotes.find(n => n.note.startsWith('Late Reason:'));
  
  const saveAuthorName = (name) => {
    setAuthorName(name);
    try { localStorage.setItem('droppoint-author-name', name); } catch(e) {}
  };
  
  const submitNote = () => {
    if (newNote.trim() && authorName.trim()) {
      onAddNote(b.bookingRef, newNote.trim(), authorName.trim());
      setNewNote('');
    }
  };
  
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: Z2U.white, borderRadius: 16, maxWidth: 700, width: '100%', maxHeight: '90vh', overflow: 'auto', padding: 0 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${Z2U.medGrey}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Booking details</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: Z2U.blue, marginTop: 4 }}>{b.bookingRef}</div>
            <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>PO: {b.po}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700, background: b.speed === 'VIP' ? Z2U.melon : b.speed === '3 hour' ? Z2U.blue : Z2U.yellow, color: Z2U.white }}>
              {b.speed}
            </span>
            {b.isLate && !isMarkedNotLate && <span style={{ padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700, background: Z2U.melon, color: Z2U.white }}>+{formatMins(b.delayMins).substring(1)}</span>}
            {(b.isOnTime || isMarkedNotLate) && <span style={{ padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700, background: Z2U.green, color: Z2U.white }}>{isMarkedNotLate ? 'Marked not late' : 'On time'}</span>}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={20} color={Z2U.grey} />
            </button>
          </div>
        </div>
        
        {/* Details Grid */}
        <div style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            <DetailCell label="Date" value={formatDate(b.date)} />
            <DetailCell label="Speed" value={b.speed} />
            <DetailCell label="Late by" value={b.isLate ? formatMins(b.delayMins) : b.isOnTime ? 'On time' : '—'} valueColor={b.isLate ? Z2U.melon : Z2U.green} />
            <DetailCell label="Courier" value={b.courier || '—'} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            <DetailCell label="Distance" value={`${b.distanceKm} km`} />
            <DetailCell label="Booked" value={b.requestedPickup ? formatTime(b.requestedPickup) : `${b.hour}:00`} />
            <DetailCell label="SLA" value={b.speed === 'Same day' ? 'By drop time' : formatSLA(b.slaMins)} />
            <DetailCell label="State" value={b.state} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            <DetailCell label="Expected delivery" value={expectedDel ? formatTime(expectedDel.toISOString()) : '—'} />
            <DetailCell label="Actual delivery" value={formatTime(b.dropActual)} valueColor={b.isLate ? Z2U.melon : Z2U.green} />
            <DetailCell label="Booking → Pickup" value={b.bookingToPickup !== null ? formatMins(b.bookingToPickup) : '—'} />
            <DetailCell label="Pickup → Delivery" value={b.pickupToDeliveryMins !== null ? formatMins(b.pickupToDeliveryMins) : '—'} />
          </div>
          
          {/* Addresses */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: Z2U.blue, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Pickup address</div>
            <div style={{ fontSize: 13, color: Z2U.grey, lineHeight: 1.4 }}>{b.pickupAddress}</div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: Z2U.blue, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Drop address</div>
            <div style={{ fontSize: 13, color: Z2U.grey, lineHeight: 1.4 }}>{b.dropAddress}</div>
          </div>
          
          {/* Late Reason */}
          {b.isLate && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: Z2U.melon, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Late reason</div>
              
              {/* Show assigned reason if exists */}
              {lateReasonNote && (
                <div style={{ padding: '10px 14px', background: Z2U.melon + '10', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: Z2U.melon }}>{lateReasonNote.note.replace('Late Reason: ', '')}</span>
                  <button onClick={() => { if (onDeleteNote && lateReasonNote.id) onDeleteNote(lateReasonNote.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#9CA3AF', textDecoration: 'underline' }}>
                    Change
                  </button>
                </div>
              )}
              
              {/* Show "Marked as Not Late" with undo */}
              {isMarkedNotLate && (
                <div style={{ padding: '10px 14px', background: Z2U.green + '10', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: Z2U.green }}>✓ Marked as not late</span>
                  <button onClick={() => {
                    const notLateNote = bookingNotes.find(n => n.note === 'Marked as Not Late');
                    if (onDeleteNote && notLateNote && notLateNote.id) onDeleteNote(notLateNote.id);
                  }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#9CA3AF', textDecoration: 'underline' }}>
                    Undo
                  </button>
                </div>
              )}
              
              {/* Show reason picker if no reason assigned and not marked not-late */}
              {!lateReasonNote && !isMarkedNotLate && !showReasons && (
                <button onClick={() => setShowReasons(true)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px dashed ${Z2U.melon}`, background: 'transparent', color: Z2U.melon, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Assign late reason
                </button>
              )}
              
              {showReasons && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: Z2U.melon, textTransform: 'uppercase', letterSpacing: 1, padding: '8px 0 4px', position: 'sticky', top: 0, background: Z2U.white }}>Controllable</div>
                  {LATE_REASONS.filter(r => LATE_REASON_STATUS[r] === 'Controllable').map(reason => (
                    <button key={reason} onClick={() => { onAssignReason(b.bookingRef, reason); setShowReasons(false); }}
                      style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${Z2U.medGrey}`, background: Z2U.white, color: Z2U.grey, cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.15s', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2 }}
                      onMouseOver={e => { e.currentTarget.style.background = Z2U.melon + '10'; e.currentTarget.style.borderColor = Z2U.melon; }}
                      onMouseOut={e => { e.currentTarget.style.background = Z2U.white; e.currentTarget.style.borderColor = Z2U.medGrey; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>{reason}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: Z2U.melon, background: Z2U.melon + '15', padding: '1px 6px', borderRadius: 8 }}>Controllable</span>
                      </div>
                      {LATE_REASON_DESCRIPTIONS[reason] && <span style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.3 }}>{LATE_REASON_DESCRIPTIONS[reason]}</span>}
                    </button>
                  ))}
                  <div style={{ fontSize: 11, fontWeight: 700, color: Z2U.blue, textTransform: 'uppercase', letterSpacing: 1, padding: '12px 0 4px', position: 'sticky', top: 0, background: Z2U.white }}>Uncontrollable</div>
                  {LATE_REASONS.filter(r => LATE_REASON_STATUS[r] === 'Uncontrollable').map(reason => (
                    <button key={reason} onClick={() => { onAssignReason(b.bookingRef, reason); setShowReasons(false); }}
                      style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${Z2U.medGrey}`, background: Z2U.white, color: Z2U.grey, cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.15s', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2 }}
                      onMouseOver={e => { e.currentTarget.style.background = Z2U.blue + '10'; e.currentTarget.style.borderColor = Z2U.blue; }}
                      onMouseOut={e => { e.currentTarget.style.background = Z2U.white; e.currentTarget.style.borderColor = Z2U.medGrey; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>{reason}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: Z2U.blue, background: Z2U.blue + '15', padding: '1px 6px', borderRadius: 8 }}>Uncontrollable</span>
                      </div>
                      {LATE_REASON_DESCRIPTIONS[reason] && <span style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.3 }}>{LATE_REASON_DESCRIPTIONS[reason]}</span>}
                    </button>
                  ))}
                  <button onClick={() => { onAddNote(b.bookingRef, 'Marked as Not Late', authorName.trim() || 'User'); setShowReasons(false); }}
                    style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${Z2U.green}`, background: Z2U.green + '10', color: Z2U.green, cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'left', transition: 'all 0.15s', marginTop: 4 }}
                    onMouseOver={e => { e.currentTarget.style.background = Z2U.green; e.currentTarget.style.color = Z2U.white; }}
                    onMouseOut={e => { e.currentTarget.style.background = Z2U.green + '10'; e.currentTarget.style.color = Z2U.green; }}
                  >
                    ✓ Mark as Not Late
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Notes */}
          <div style={{ borderTop: `1px solid ${Z2U.medGrey}`, paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Notes</div>
            {bookingNotes.length > 0 && (
              <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bookingNotes.map((n, i) => (
                  <div key={n.id || i} style={{ padding: '10px 14px', background: Z2U.lightGrey, borderRadius: 8, fontSize: 13 }}>
                    <div style={{ color: Z2U.grey, fontWeight: 500 }}>{n.note}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{n.author} · {formatDateTime(n.timestamp)}</div>
                  </div>
                ))}
              </div>
            )}
            {/* Name field */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={authorName} onChange={e => saveAuthorName(e.target.value)} placeholder="Your name"
                style={{ width: 160, padding: '10px 14px', borderRadius: 8, border: `1px solid ${Z2U.medGrey}`, fontSize: 13, outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note..."
                style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1px solid ${Z2U.medGrey}`, fontSize: 13, outline: 'none' }}
                onKeyDown={e => { if (e.key === 'Enter') submitNote(); }}
              />
              <button onClick={submitNote}
                disabled={!newNote.trim() || !authorName.trim()}
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: (!newNote.trim() || !authorName.trim()) ? Z2U.medGrey : Z2U.blue, color: Z2U.white, cursor: (!newNote.trim() || !authorName.trim()) ? 'default' : 'pointer', fontWeight: 600, fontSize: 13 }}>
                Add Note
              </button>
            </div>
            {!authorName.trim() && <div style={{ fontSize: 11, color: Z2U.melon, marginTop: 4 }}>Please enter your name to add notes</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCell({ label, value, valueColor }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: valueColor || Z2U.grey }}>{value}</div>
    </div>
  );
}

// ─── Late Deliveries Drawer ───
function LateDrawer({ title, bookings, notes, onClose, onSelect }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('delay');
  const [sortDir, setSortDir] = useState('desc');
  
  const filtered = bookings.filter(b => {
    const s = search.toLowerCase();
    return !s || b.bookingRef.toLowerCase().includes(s) || b.po.toLowerCase().includes(s) || b.courier.toLowerCase().includes(s);
  }).sort((a, b) => {
    const dir = sortDir === 'desc' ? -1 : 1;
    if (sortBy === 'delay') return dir * (a.delayMins - b.delayMins);
    if (sortBy === 'date') return dir * (new Date(a.date) - new Date(b.date));
    return 0;
  });
  
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: Z2U.white, borderRadius: 16, maxWidth: 800, width: '100%', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${Z2U.medGrey}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: Z2U.white, zIndex: 1, borderRadius: '16px 16px 0 0' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: Z2U.grey }}>{title}</div>
            <div style={{ fontSize: 13, color: '#9CA3AF' }}>{filtered.length} bookings found</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} color={Z2U.grey} /></button>
        </div>
        <div style={{ padding: '12px 24px', display: 'flex', gap: 12, borderBottom: `1px solid ${Z2U.medGrey}` }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by reference, PO, or courier..."
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 8, border: `1px solid ${Z2U.medGrey}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${Z2U.medGrey}`, fontSize: 13, color: Z2U.grey }}>
            <option value="delay">Sort by delay</option>
            <option value="date">Sort by date</option>
          </select>
          <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${Z2U.medGrey}`, background: Z2U.white, cursor: 'pointer', fontSize: 13, color: Z2U.grey, fontWeight: 600 }}>
            {sortDir === 'desc' ? '↓ Desc' : '↑ Asc'}
          </button>
        </div>
        <div style={{ padding: '8px 24px 24px' }}>
          {filtered.map(b => (
            <div key={b.bookingRef} onClick={() => onSelect(b)} style={{ padding: 16, marginTop: 8, border: `1px solid ${Z2U.medGrey}`, borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseOver={e => e.currentTarget.style.borderColor = Z2U.blue}
              onMouseOut={e => e.currentTarget.style.borderColor = Z2U.medGrey}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: Z2U.blue }}>{b.bookingRef}</span>
                  <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 12 }}>PO: {b.po}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{formatDate(b.date)}</span>
                  <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: b.speed === 'VIP' ? Z2U.melon : b.speed === '3 hour' ? Z2U.blue : Z2U.yellow, color: Z2U.white }}>{b.speed}</span>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{b.state}</span>
                  <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: Z2U.melon, color: Z2U.white }}>{formatMins(b.delayMins)}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, fontSize: 12 }}>
                <div><span style={{ color: '#9CA3AF' }}>Courier: </span><span style={{ color: Z2U.grey, fontWeight: 500 }}>{b.courier || '—'}</span></div>
                <div><span style={{ color: '#9CA3AF' }}>Distance: </span><span style={{ color: Z2U.grey, fontWeight: 500 }}>{b.distanceKm} km</span></div>
                <div><span style={{ color: '#9CA3AF' }}>Booked: </span><span style={{ color: Z2U.grey, fontWeight: 500 }}>{b.requestedPickup ? formatTime(b.requestedPickup) : `${b.hour}:00`}</span></div>
                <div><span style={{ color: '#9CA3AF' }}>SLA: </span><span style={{ color: Z2U.grey, fontWeight: 500 }}>{b.speed === 'Same day' ? 'By drop' : formatSLA(b.slaMins)}</span></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, fontSize: 12, marginTop: 6 }}>
                <div><span style={{ color: '#9CA3AF' }}>Expected: </span><span style={{ color: Z2U.grey, fontWeight: 500 }}>{b.expectedDelivery ? formatTime(b.expectedDelivery.toISOString()) : '—'}</span></div>
                <div><span style={{ color: '#9CA3AF' }}>Delivered: </span><span style={{ color: Z2U.melon, fontWeight: 500 }}>{formatTime(b.dropActual)}</span></div>
                <div><span style={{ color: '#9CA3AF' }}>Book→Pick: </span><span style={{ color: Z2U.grey, fontWeight: 500 }}>{b.bookingToPickup !== null ? formatMins(b.bookingToPickup) : '—'}</span></div>
                <div><span style={{ color: '#9CA3AF' }}>Pick→Del: </span><span style={{ color: Z2U.grey, fontWeight: 500 }}>{b.pickupToDeliveryMins !== null ? formatMins(b.pickupToDeliveryMins) : '—'}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab Content Components ───

function OverviewTab({ data, notes, onViewLate, onSelectBooking }) {
  const total = data.length;
  const completed = data.filter(d => d.status === 'Dropped Off');
  const onTime = completed.filter(d => d.isOnTime).length;
  const late = completed.filter(d => d.isLate).length;
  const difot = completed.length > 0 ? ((onTime / completed.length) * 100).toFixed(1) : 0;
  
  // State breakdown
  const stateData = {};
  completed.forEach(d => {
    if (!stateData[d.state]) stateData[d.state] = { state: d.state, total: 0, onTime: 0, late: 0 };
    stateData[d.state].total++;
    if (d.isOnTime) stateData[d.state].onTime++;
    if (d.isLate) stateData[d.state].late++;
  });
  const stateArr = Object.values(stateData).map(s => ({ ...s, difot: s.total > 0 ? ((s.onTime / s.total) * 100).toFixed(1) : 0 })).sort((a, b) => b.difot - a.difot);
  
  // Pie data
  const pieData = [
    { name: 'On Time', value: onTime, color: Z2U.green },
    { name: 'Late', value: late, color: Z2U.melon },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard icon={Package} label="Total bookings" value={total} sub="In selected period" />
        <StatCard icon={Clock} label="Overall DIFOT" value={`${difot}%`} sub="Delivered in full on time" color={Z2U.blue} />
        <StatCard icon={CheckCircle} label="On time" value={onTime} sub={`${difot}% success`} color={Z2U.green} />
        <StatCard icon={XCircle} label="Late deliveries" value={late} sub={<span style={{ cursor: 'pointer', color: Z2U.blue }} onClick={() => onViewLate('All States', completed.filter(d => d.isLate))}>Click to view {late} late →</span>} color={Z2U.melon} />
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
        {/* DIFOT by State */}
        <div style={{ background: Z2U.white, borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${Z2U.medGrey}` }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: Z2U.grey, marginBottom: 4 }}>DIFOT by state</div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>Click bar to view delayed bookings</div>
          <ResponsiveContainer width="100%" height={stateArr.length * 52 + 20}>
            <BarChart data={stateArr} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} fontSize={11} />
              <YAxis type="category" dataKey="state" width={40} fontSize={12} fontWeight={600} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="difot" radius={[0, 6, 6, 0]} cursor="pointer"
                onClick={(data) => {
                  const lateBookings = completed.filter(d => d.isLate && d.state === data.state);
                  if (lateBookings.length > 0) onViewLate(`Late deliveries — ${data.state}`, lateBookings);
                }}>
                {stateArr.map((entry, i) => (
                  <Cell key={i} fill={parseFloat(entry.difot) >= 80 ? Z2U.green : parseFloat(entry.difot) >= 60 ? Z2U.blue : Z2U.melon} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Delivery Status Pie */}
        <div style={{ background: Z2U.white, borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${Z2U.medGrey}` }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: Z2U.grey, marginBottom: 16 }}>Delivery status</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 8 }}>
            {pieData.map(p => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color }} />
                <span style={{ color: Z2U.grey, fontWeight: 500 }}>{p.name}: {p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* State Performance Details Table */}
      <div style={{ background: Z2U.white, borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${Z2U.medGrey}`, marginTop: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: Z2U.grey, marginBottom: 4 }}>State performance details</div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>Click late count to view bookings</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${Z2U.medGrey}` }}>
              {['State','Total','On time','Late','DIFOT'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stateArr.map(s => (
              <tr key={s.state} style={{ borderBottom: `1px solid ${Z2U.lightGrey}` }}>
                <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 700, color: Z2U.grey }}>{s.state}</td>
                <td style={{ padding: '14px 16px', fontSize: 14, color: Z2U.grey }}>{s.total}</td>
                <td style={{ padding: '14px 16px', fontSize: 14, color: Z2U.green, fontWeight: 600 }}>{s.onTime}</td>
                <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600 }}>
                  <span style={{ color: Z2U.melon, cursor: s.late > 0 ? 'pointer' : 'default', textDecoration: s.late > 0 ? 'underline' : 'none' }}
                    onClick={() => {
                      if (s.late > 0) {
                        const lateBookings = completed.filter(d => d.isLate && d.state === s.state);
                        onViewLate(`Late deliveries — ${s.state}`, lateBookings);
                      }
                    }}>{s.late}</span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: Z2U.lightGrey, overflow: 'hidden', maxWidth: 120 }}>
                      <div style={{ width: `${s.difot}%`, height: '100%', borderRadius: 4, background: parseFloat(s.difot) >= 80 ? Z2U.green : parseFloat(s.difot) >= 60 ? Z2U.blue : Z2U.melon, transition: 'width 0.5s' }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: parseFloat(s.difot) >= 80 ? Z2U.green : parseFloat(s.difot) >= 60 ? Z2U.blue : Z2U.melon }}>{s.difot}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActiveBookingsTab({ data, onSelectBooking }) {
  const active = data.filter(d => d.status !== 'Dropped Off' && d.status !== '' && d.status !== 'Tried to deliver' && d.status !== 'Cancelled' && d.status !== 'Returned' && d.status !== 'cancelled' && d.status !== 'returned');
  const now = new Date();
  
  // Sort: overdue first, then by expected delivery
  const sorted = [...active].sort((a, b) => {
    const aOverdue = a.expectedDelivery && now > a.expectedDelivery;
    const bOverdue = b.expectedDelivery && now > b.expectedDelivery;
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (a.expectedDelivery && b.expectedDelivery) return a.expectedDelivery - b.expectedDelivery;
    return 0;
  });

  const overdueCount = sorted.filter(b => b.expectedDelivery && now > b.expectedDelivery).length;

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard icon={Package} label="Active bookings" value={active.length} color={Z2U.blue} />
        {overdueCount > 0 && <StatCard icon={AlertTriangle} label="Overdue" value={overdueCount} sub="Past expected delivery" color={Z2U.melon} />}
      </div>
      {sorted.length === 0 ? (
        <div style={{ background: Z2U.white, borderRadius: 12, padding: 40, textAlign: 'center', color: '#9CA3AF', border: `1px solid ${Z2U.medGrey}` }}>No active bookings at this time</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map(b => {
            const isOverdue = b.expectedDelivery && now > b.expectedDelivery;
            const minsOverdue = isOverdue ? Math.round((now - b.expectedDelivery) / 60000) : 0;
            const minsRemaining = !isOverdue && b.expectedDelivery ? Math.round((b.expectedDelivery - now) / 60000) : null;
            
            return (
              <div key={b.bookingRef} onClick={() => onSelectBooking(b)} 
                style={{ background: Z2U.white, borderRadius: 12, padding: 16, border: `2px solid ${isOverdue ? Z2U.melon : Z2U.medGrey}`, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseOver={e => e.currentTarget.style.borderColor = isOverdue ? Z2U.melon : Z2U.blue}
                onMouseOut={e => e.currentTarget.style.borderColor = isOverdue ? Z2U.melon : Z2U.medGrey}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: Z2U.blue }}>{b.bookingRef}</span>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: b.speed === 'VIP' ? Z2U.melon : b.speed === '3 hour' ? Z2U.blue : Z2U.yellow, color: Z2U.white }}>{b.speed}</span>
                    {isOverdue && (
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: Z2U.melon, color: Z2U.white }}>
                        OVERDUE +{formatMins(minsOverdue).substring(1)}
                      </span>
                    )}
                    {!isOverdue && minsRemaining !== null && minsRemaining <= 30 && (
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: Z2U.yellow + '20', color: Z2U.yellow, border: `1px solid ${Z2U.yellow}` }}>
                        {minsRemaining}m remaining
                      </span>
                    )}
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: '#9CA3AF', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8 }}>
                  <span>Courier: <strong style={{ color: Z2U.grey }}>{b.courier || '—'}</strong></span>
                  <span>State: <strong style={{ color: Z2U.grey }}>{b.state}</strong></span>
                  <span>SLA: <strong style={{ color: Z2U.grey }}>{b.speed === 'Same day' ? 'By drop time' : formatSLA(b.slaMins)}</strong></span>
                  <span>Expected: <strong style={{ color: isOverdue ? Z2U.melon : Z2U.grey }}>{b.expectedDelivery ? formatTime(b.expectedDelivery.toISOString()) : '—'}</strong></span>
                  <span>Pickup: <strong style={{ color: Z2U.grey }}>{b.requestedPickup ? formatTime(b.requestedPickup) : '—'}</strong></span>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: '#9CA3AF', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8 }}>
                  <span>PO: <strong style={{ color: Z2U.grey }}>{b.po || '—'}</strong></span>
                  <span>Distance: <strong style={{ color: Z2U.grey }}>{b.distanceKm} km</strong></span>
                  <span>Customer: <strong style={{ color: Z2U.grey }}>{b.customer}</strong></span>
                  <span>Date: <strong style={{ color: Z2U.grey }}>{formatDate(b.date)}</strong></span>
                  <span></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    'On Route to Pickup': { bg: Z2U.yellow + '20', color: Z2U.yellow, border: Z2U.yellow },
    'Picked up': { bg: Z2U.blue + '20', color: Z2U.blue, border: Z2U.blue },
    'On Route to Dropoff': { bg: Z2U.blue + '20', color: Z2U.blue, border: Z2U.blue },
    'Accepted': { bg: Z2U.green + '20', color: Z2U.green, border: Z2U.green },
    'Dropped Off': { bg: Z2U.green + '20', color: Z2U.green, border: Z2U.green },
  };
  const c = colors[status] || { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' };
  return <span style={{ padding: '4px 12px', borderRadius: 16, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>{status}</span>;
}

function DeliveryHistoryTab({ data, onSelectBooking }) {
  const completed = data.filter(d => d.status === 'Dropped Off');
  const bySpeed = { 'VIP': [], '3 hour': [], 'Same day': [] };
  completed.forEach(d => { if (bySpeed[d.speed]) bySpeed[d.speed].push(d); });
  
  const [activeSpeed, setActiveSpeed] = useState('VIP');
  const [search, setSearch] = useState('');
  
  const list = (bySpeed[activeSpeed] || []).filter(b => {
    const s = search.toLowerCase();
    return !s || b.bookingRef.toLowerCase().includes(s) || b.po.toLowerCase().includes(s) || b.courier.toLowerCase().includes(s);
  });

  const speedStats = Object.entries(bySpeed).map(([speed, items]) => {
    const ot = items.filter(i => i.isOnTime).length;
    return { speed, total: items.length, onTime: ot, late: items.length - ot, difot: items.length > 0 ? ((ot / items.length) * 100).toFixed(1) : 0 };
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {speedStats.map(ss => (
          <div key={ss.speed} onClick={() => setActiveSpeed(ss.speed)}
            style={{ flex: 1, minWidth: 200, background: Z2U.white, borderRadius: 12, padding: 16, border: `2px solid ${activeSpeed === ss.speed ? Z2U.blue : Z2U.medGrey}`, cursor: 'pointer', transition: 'all 0.15s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: Z2U.grey }}>{ss.speed}</span>
              <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: ss.speed === 'VIP' ? Z2U.melon : ss.speed === '3 hour' ? Z2U.blue : Z2U.yellow, color: Z2U.white }}>{ss.total}</span>
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>
              <span style={{ color: Z2U.green, fontWeight: 600 }}>{ss.onTime} on time</span> · <span style={{ color: Z2U.melon, fontWeight: 600 }}>{ss.late} late</span> · DIFOT: <strong>{ss.difot}%</strong>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by reference, PO, or courier..."
          style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: 10, border: `1px solid ${Z2U.medGrey}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      </div>
      
      <BookingTable bookings={list} onSelect={onSelectBooking} />
    </div>
  );
}

function BookingTable({ bookings, onSelect }) {
  const [page, setPage] = useState(0);
  const perPage = 20;
  const pages = Math.ceil(bookings.length / perPage);
  const shown = bookings.slice(page * perPage, (page + 1) * perPage);
  
  useEffect(() => setPage(0), [bookings.length]);
  
  return (
    <div style={{ background: Z2U.white, borderRadius: 12, border: `1px solid ${Z2U.medGrey}`, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: Z2U.lightGrey }}>
              {['Ref','PO','Date','Speed','Courier','State','Distance','SLA','Status','Delay'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map(b => (
              <tr key={b.bookingRef} onClick={() => onSelect(b)} style={{ borderBottom: `1px solid ${Z2U.lightGrey}`, cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseOver={e => e.currentTarget.style.background = Z2U.lightGrey}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '10px 12px', color: Z2U.blue, fontWeight: 600, whiteSpace: 'nowrap' }}>{b.bookingRef}</td>
                <td style={{ padding: '10px 12px', color: Z2U.grey, whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.po}</td>
                <td style={{ padding: '10px 12px', color: Z2U.grey, whiteSpace: 'nowrap' }}>{formatDate(b.date)}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: b.speed === 'VIP' ? Z2U.melon : b.speed === '3 hour' ? Z2U.blue : Z2U.yellow, color: Z2U.white }}>{b.speed}</span>
                </td>
                <td style={{ padding: '10px 12px', color: Z2U.grey, whiteSpace: 'nowrap', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.courier || '—'}</td>
                <td style={{ padding: '10px 12px', color: Z2U.grey }}>{b.state}</td>
                <td style={{ padding: '10px 12px', color: Z2U.grey }}>{b.distanceKm} km</td>
                <td style={{ padding: '10px 12px', color: Z2U.grey, whiteSpace: 'nowrap' }}>{b.speed === 'Same day' ? 'By drop' : formatSLA(b.slaMins)}</td>
                <td style={{ padding: '10px 12px' }}>
                  {b.isOnTime && <span style={{ color: Z2U.green, fontWeight: 600 }}>On time</span>}
                  {b.isLate && <span style={{ color: Z2U.melon, fontWeight: 600 }}>Late</span>}
                  {!b.isOnTime && !b.isLate && <span style={{ color: '#9CA3AF' }}>{b.status}</span>}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {b.isLate && <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: Z2U.melon, color: Z2U.white }}>{formatMins(b.delayMins)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${Z2U.lightGrey}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, bookings.length)} of {bookings.length}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${Z2U.medGrey}`, background: Z2U.white, cursor: 'pointer', fontSize: 12 }}>Prev</button>
            <button onClick={() => setPage(Math.min(pages - 1, page + 1))} disabled={page >= pages - 1} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${Z2U.medGrey}`, background: Z2U.white, cursor: 'pointer', fontSize: 12 }}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ByPickupTab({ data, onSelectBooking }) {
  const completed = data.filter(d => d.status === 'Dropped Off');
  const pickupMap = {};
  completed.forEach(d => {
    const addr = d.pickupAddress || 'Unknown';
    // Shorten address
    const short = addr.split(',').slice(0, 2).join(', ');
    if (!pickupMap[short]) pickupMap[short] = { address: short, full: addr, total: 0, onTime: 0, late: 0, bookings: [] };
    pickupMap[short].total++;
    if (d.isOnTime) pickupMap[short].onTime++;
    if (d.isLate) pickupMap[short].late++;
    pickupMap[short].bookings.push(d);
  });
  const pickups = Object.values(pickupMap).sort((a, b) => b.total - a.total);
  const [selected, setSelected] = useState(null);
  
  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard icon={MapPin} label="Pickup locations" value={pickups.length} color={Z2U.blue} />
        <StatCard icon={Package} label="Total completed" value={completed.length} color={Z2U.green} />
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pickups.map(p => (
          <div key={p.address} style={{ background: Z2U.white, borderRadius: 12, padding: 16, border: `1px solid ${Z2U.medGrey}`, cursor: 'pointer', transition: 'all 0.15s' }}
            onClick={() => setSelected(selected === p.address ? null : p.address)}
            onMouseOver={e => e.currentTarget.style.borderColor = Z2U.blue}
            onMouseOut={e => e.currentTarget.style.borderColor = Z2U.medGrey}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MapPin size={16} color={Z2U.blue} />
                <span style={{ fontSize: 14, fontWeight: 600, color: Z2U.grey }}>{p.address}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
                <span style={{ color: Z2U.grey, fontWeight: 600 }}>{p.total} deliveries</span>
                <span style={{ color: Z2U.green, fontWeight: 600 }}>{p.onTime} on time</span>
                <span style={{ color: Z2U.melon, fontWeight: 600 }}>{p.late} late</span>
                <span style={{ fontWeight: 700, color: ((p.onTime / p.total) * 100) >= 70 ? Z2U.green : Z2U.melon }}>{((p.onTime / p.total) * 100).toFixed(0)}%</span>
              </div>
            </div>
            {selected === p.address && (
              <div style={{ marginTop: 12 }}>
                <BookingTable bookings={p.bookings} onSelect={onSelectBooking} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ByDriverTab({ data, onSelectBooking }) {
  const completed = data.filter(d => d.status === 'Dropped Off' && d.courier);
  const driverMap = {};
  completed.forEach(d => {
    if (!driverMap[d.courier]) driverMap[d.courier] = { name: d.courier, total: 0, onTime: 0, late: 0, totalDelay: 0, bookings: [] };
    driverMap[d.courier].total++;
    if (d.isOnTime) driverMap[d.courier].onTime++;
    if (d.isLate) { driverMap[d.courier].late++; driverMap[d.courier].totalDelay += d.delayMins; }
    driverMap[d.courier].bookings.push(d);
  });
  const drivers = Object.values(driverMap).sort((a, b) => b.total - a.total);
  const [selected, setSelected] = useState(null);
  const [sortKey, setSortKey] = useState('total');
  
  const sorted = [...drivers].sort((a, b) => {
    if (sortKey === 'total') return b.total - a.total;
    if (sortKey === 'difot') return (b.onTime / b.total) - (a.onTime / a.total);
    if (sortKey === 'late') return b.late - a.late;
    return 0;
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard icon={Users} label="Drivers" value={drivers.length} color={Z2U.blue} />
        <StatCard icon={Package} label="Total deliveries" value={completed.length} color={Z2U.green} />
      </div>
      
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['total', 'Most deliveries'], ['difot', 'Best DIFOT'], ['late', 'Most late']].map(([k, l]) => (
          <button key={k} onClick={() => setSortKey(k)} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${sortKey === k ? Z2U.blue : Z2U.medGrey}`, background: sortKey === k ? Z2U.blue : Z2U.white, color: sortKey === k ? Z2U.white : Z2U.grey, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{l}</button>
        ))}
      </div>
      
      <div style={{ background: Z2U.white, borderRadius: 12, border: `1px solid ${Z2U.medGrey}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: Z2U.lightGrey }}>
              {['Driver','Deliveries','On time','Late','DIFOT','Avg delay'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 30).map(d => {
              const difot = ((d.onTime / d.total) * 100).toFixed(1);
              const avgDelay = d.late > 0 ? (d.totalDelay / d.late).toFixed(0) : 0;
              return (
                <tr key={d.name} style={{ borderBottom: `1px solid ${Z2U.lightGrey}`, cursor: 'pointer' }}
                  onClick={() => setSelected(selected === d.name ? null : d.name)}
                  onMouseOver={e => e.currentTarget.style.background = Z2U.lightGrey}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: Z2U.grey }}>{d.name}</td>
                  <td style={{ padding: '12px 14px', color: Z2U.grey }}>{d.total}</td>
                  <td style={{ padding: '12px 14px', color: Z2U.green, fontWeight: 600 }}>{d.onTime}</td>
                  <td style={{ padding: '12px 14px', color: Z2U.melon, fontWeight: 600 }}>{d.late}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 6, borderRadius: 3, background: Z2U.lightGrey, overflow: 'hidden' }}>
                        <div style={{ width: `${difot}%`, height: '100%', borderRadius: 3, background: parseFloat(difot) >= 70 ? Z2U.green : Z2U.melon }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: parseFloat(difot) >= 70 ? Z2U.green : Z2U.melon }}>{difot}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', color: Z2U.grey }}>{avgDelay > 0 ? `${avgDelay}m` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {selected && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: Z2U.grey, marginBottom: 8 }}>{selected}'s deliveries</div>
          <BookingTable bookings={driverMap[selected]?.bookings || []} onSelect={onSelectBooking} />
        </div>
      )}
    </div>
  );
}

function TimingAnalysisTab({ data }) {
  const completed = data.filter(d => d.status === 'Dropped Off');
  
  // By hour of day
  const hourData = {};
  for (let h = 6; h <= 20; h++) {
    hourData[h] = { hour: h, label: `${h}:00`, total: 0, onTime: 0, late: 0 };
  }
  completed.forEach(d => {
    const h = d.hour;
    if (hourData[h]) {
      hourData[h].total++;
      if (d.isOnTime) hourData[h].onTime++;
      if (d.isLate) hourData[h].late++;
    }
  });
  const hourArr = Object.values(hourData).filter(h => h.total > 0).map(h => ({
    ...h, difot: h.total > 0 ? parseFloat(((h.onTime / h.total) * 100).toFixed(1)) : 0
  }));
  
  // Best and worst hours
  const sortedHours = [...hourArr].filter(h => h.total >= 3).sort((a, b) => b.difot - a.difot);
  const bestHour = sortedHours[0];
  const worstHour = sortedHours[sortedHours.length - 1];

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard icon={TrendingUp} label="Best time" value={bestHour ? `${bestHour.label}` : '—'} sub={bestHour ? `${bestHour.difot}% DIFOT (${bestHour.total} deliveries)` : ''} color={Z2U.green} />
        <StatCard icon={AlertTriangle} label="Worst time" value={worstHour ? `${worstHour.label}` : '—'} sub={worstHour ? `${worstHour.difot}% DIFOT (${worstHour.total} deliveries)` : ''} color={Z2U.melon} />
      </div>
      
      <div style={{ background: Z2U.white, borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${Z2U.medGrey}`, marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: Z2U.grey, marginBottom: 16 }}>DIFOT by time of day</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hourArr}>
            <CartesianGrid strokeDasharray="3 3" stroke={Z2U.medGrey} />
            <XAxis dataKey="label" fontSize={11} />
            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} fontSize={11} />
            <Tooltip formatter={(v, name) => name === 'difot' ? `${v}%` : v} />
            <Bar dataKey="difot" radius={[6, 6, 0, 0]}>
              {hourArr.map((entry, i) => (
                <Cell key={i} fill={entry.difot >= 70 ? Z2U.green : entry.difot >= 50 ? Z2U.blue : Z2U.melon} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div style={{ background: Z2U.white, borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${Z2U.medGrey}` }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: Z2U.grey, marginBottom: 16 }}>Volume and performance by hour</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hourArr}>
            <CartesianGrid strokeDasharray="3 3" stroke={Z2U.medGrey} />
            <XAxis dataKey="label" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Bar dataKey="onTime" name="On time" fill={Z2U.green} stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="late" name="Late" fill={Z2U.melon} stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DelaysTab({ data, notes, onSelectBooking }) {
  const lateBookings = data.filter(d => d.status === 'Dropped Off' && d.isLate).sort((a, b) => b.delayMins - a.delayMins);
  
  // Group by reason from notes
  const reasonCounts = {};
  const reasonByBooking = {};
  notes.forEach(n => {
    if (n.note.startsWith('Late Reason:')) {
      const reason = n.note.replace('Late Reason:', '').trim();
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      reasonByBooking[n.bookingRef] = reason;
    }
    if (n.note === 'Marked as Not Late') {
      reasonByBooking[n.bookingRef] = 'Marked as Not Late';
    }
  });
  
  const [search, setSearch] = useState('');
  const filtered = lateBookings.filter(b => {
    const s = search.toLowerCase();
    return !s || b.bookingRef.toLowerCase().includes(s) || b.po.toLowerCase().includes(s) || b.courier.toLowerCase().includes(s);
  });

  const downloadCSV = () => {
    const headers = ['Booking Ref', 'PO', 'Date', 'Speed', 'Distance (km)', 'SLA', 'Minutes Late', 'Courier', 'Late Reason', 'Notes'];

    const escapeCSV = (val) => {
      const str = String(val == null ? '' : val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const rows = filtered.map(b => {
      const reason = reasonByBooking[b.bookingRef] || '';
      const bookingNotes = notes
        .filter(n => n.bookingRef === b.bookingRef && !n.note.startsWith('Late Reason:') && n.note !== 'Marked as Not Late')
        .map(n => `${n.author}: ${n.note}`)
        .join(' | ');
      
      return [
        b.bookingRef,
        b.po,
        b.requestedPickup ? new Date(b.requestedPickup).toLocaleDateString('en-AU') : formatDate(b.date),
        b.speed,
        b.distanceKm,
        b.speed === 'Same day' ? 'By drop time' : b.slaMins,
        Math.round(b.delayMins),
        b.courier,
        reason,
        bookingNotes,
      ].map(escapeCSV);
    });

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `late_deliveries_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard icon={AlertTriangle} label="Total delays" value={lateBookings.length} color={Z2U.melon} />
        <StatCard icon={Clock} label="Avg delay" value={lateBookings.length > 0 ? `${Math.round(lateBookings.reduce((s, b) => s + b.delayMins, 0) / lateBookings.length)}m` : '0m'} color={Z2U.yellow} />
        <StatCard icon={XCircle} label="Max delay" value={lateBookings.length > 0 ? formatMins(Math.max(...lateBookings.map(b => b.delayMins))) : '—'} color={Z2U.melon} />
      </div>
      
      {Object.keys(reasonCounts).length > 0 && (
        <div style={{ background: Z2U.white, borderRadius: 12, padding: 20, border: `1px solid ${Z2U.medGrey}`, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: Z2U.grey }}>Assigned late reasons</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
              <span style={{ color: Z2U.melon, fontWeight: 600 }}>
                Controllable: {Object.entries(reasonCounts).filter(([r]) => LATE_REASON_STATUS[r] === 'Controllable').reduce((s, [, c]) => s + c, 0)}
              </span>
              <span style={{ color: Z2U.blue, fontWeight: 600 }}>
                Uncontrollable: {Object.entries(reasonCounts).filter(([r]) => LATE_REASON_STATUS[r] === 'Uncontrollable').reduce((s, [, c]) => s + c, 0)}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]).map(([reason, count]) => {
              const isControllable = LATE_REASON_STATUS[reason] === 'Controllable';
              const color = isControllable ? Z2U.melon : Z2U.blue;
              return (
                <span key={reason} style={{ padding: '6px 14px', borderRadius: 20, background: color + '15', color: color, fontSize: 12, fontWeight: 600 }}>
                  {reason} ({count})
                </span>
              );
            })}
          </div>
        </div>
      )}
      
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search delays..."
            style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: 10, border: `1px solid ${Z2U.medGrey}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <button onClick={downloadCSV} style={{
          padding: '10px 20px', borderRadius: 10, border: 'none', background: Z2U.blue, color: Z2U.white,
          cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
        }}>
          <FileText size={15} /> Export CSV
        </button>
      </div>
      
      <BookingTable bookings={filtered} onSelect={onSelectBooking} />
    </div>
  );
}

// ─── Main Dashboard ───
export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try { return sessionStorage.getItem('droppoint-auth') === 'true'; } catch(e) { return false; }
  });
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
  const DASHBOARD_PASSWORD = 'droppoint2026';
  
  const { deliveries: allData, notes, lastSync, loading, error, addNote, deleteNote } = useDeliveryData();
  const [period, setPeriod] = useState('Month');
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customer, setCustomer] = useState('All');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [lateDrawer, setLateDrawer] = useState(null);
  
  // Filter data
  const filteredData = useMemo(() => {
    const periodFiltered = filterByPeriod(allData, period, currentDate);
    return periodFiltered.filter(d => {
      const custMatch = customer === 'All' || d.customer === customer;
      return custMatch;
    });
  }, [allData, period, currentDate, customer]);
  
  const activeCount = filteredData.filter(d => d.status !== 'Dropped Off' && d.status !== '' && d.status !== 'Tried to deliver' && d.status !== 'Cancelled' && d.status !== 'Returned' && d.status !== 'cancelled' && d.status !== 'returned').length;
  const delayCount = filteredData.filter(d => d.status === 'Dropped Off' && d.isLate).length;
  
  const handleAddNote = useCallback(async (bookingRef, noteText, author) => {
    await addNote(bookingRef, noteText, author || 'User');
  }, [addNote]);
  
  const handleDeleteNote = useCallback(async (noteId) => {
    await deleteNote(noteId);
  }, [deleteNote]);
  
  const handleAssignReason = useCallback((bookingRef, reason) => {
    handleAddNote(bookingRef, `Late Reason: ${reason}`);
  }, [handleAddNote]);
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'active', label: 'Active bookings', badge: activeCount },
    { id: 'history', label: 'Delivery history' },
    { id: 'speed', label: 'By Speed' },
    { id: 'pickup', label: 'By Pickup' },
    { id: 'driver', label: 'By Driver' },
    { id: 'timing', label: 'Timing Analysis' },
    { id: 'delays', label: 'Delays', badge: delayCount },
  ];

  const handleLogin = () => {
    if (password === DASHBOARD_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError(false);
      try { sessionStorage.setItem('droppoint-auth', 'true'); } catch(e) {}
    } else {
      setPasswordError(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'Nunito Sans', -apple-system, BlinkMacSystemFont, sans-serif", background: Z2U.lightGrey }}>
        <div style={{ background: Z2U.white, borderRadius: 16, padding: 40, maxWidth: 380, width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: Z2U.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Package size={28} color={Z2U.white} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: Z2U.grey, marginBottom: 4 }}>Droppoint Performance</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 24 }}>Enter password to access the dashboard</div>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setPasswordError(false); }}
            onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
            placeholder="Password"
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box',
              border: `1px solid ${passwordError ? Z2U.melon : Z2U.medGrey}`,
              marginBottom: 12,
            }}
            autoFocus
          />
          {passwordError && <div style={{ fontSize: 12, color: Z2U.melon, marginBottom: 12 }}>Incorrect password</div>}
          <button onClick={handleLogin} style={{
            width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none',
            background: Z2U.blue, color: Z2U.white, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'Nunito Sans', -apple-system, BlinkMacSystemFont, sans-serif", background: Z2U.lightGrey }}>
        <div style={{ textAlign: 'center' }}>
          <Package size={48} color={Z2U.blue} style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 18, fontWeight: 600, color: Z2U.grey }}>Loading delivery data...</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8 }}>Connecting to Supabase</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Nunito Sans', -apple-system, BlinkMacSystemFont, sans-serif", background: Z2U.lightGrey, minHeight: '100vh', color: Z2U.grey }}>
      {/* Header */}
      <div style={{ background: Z2U.white, borderBottom: `1px solid ${Z2U.medGrey}`, padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: Z2U.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={22} color={Z2U.white} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: Z2U.grey }}>Droppoint Performance</div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>DIFOT Analytics Dashboard</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <CustomerToggle value={customer} onChange={setCustomer} />
            <MonthNavigator allData={allData} period={period} currentDate={currentDate} onPeriodChange={setPeriod} onDateChange={setCurrentDate} />
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div style={{ padding: '12px 24px', background: Z2U.white, borderBottom: `1px solid ${Z2U.medGrey}`, display: 'flex', gap: 8, overflowX: 'auto' }}>
        {tabs.map(t => (
          <TabButton key={t.id} active={activeTab === t.id} label={t.label} badge={t.badge} onClick={() => setActiveTab(t.id)} />
        ))}
      </div>
      
      {/* Content */}
      <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        {activeTab === 'overview' && <OverviewTab data={filteredData} notes={notes} onViewLate={(title, bookings) => setLateDrawer({ title, bookings })} onSelectBooking={setSelectedBooking} />}
        {activeTab === 'active' && <ActiveBookingsTab data={filteredData} onSelectBooking={setSelectedBooking} />}
        {(activeTab === 'history' || activeTab === 'speed') && <DeliveryHistoryTab data={filteredData} onSelectBooking={setSelectedBooking} />}
        {activeTab === 'pickup' && <ByPickupTab data={filteredData} onSelectBooking={setSelectedBooking} />}
        {activeTab === 'driver' && <ByDriverTab data={filteredData} onSelectBooking={setSelectedBooking} />}
        {activeTab === 'timing' && <TimingAnalysisTab data={filteredData} />}
        {activeTab === 'delays' && <DelaysTab data={filteredData} notes={notes} onSelectBooking={setSelectedBooking} />}
      </div>
      
      {/* Footer */}
      <div style={{ padding: '16px 24px', textAlign: 'center', fontSize: 12, color: '#9CA3AF' }}>
        Showing {filteredData.length} bookings for {new Date(currentDate).toLocaleDateString('en-AU', period === 'Year' ? { year: 'numeric' } : period === 'Day' ? { day: 'numeric', month: 'long', year: 'numeric' } : { month: 'long', year: 'numeric' })}
        {lastSync && <span> · Last synced: {new Date(lastSync.completed_at).toLocaleString('en-AU')}</span>}
      </div>
      
      {/* Modals */}
      {selectedBooking && (
        <BookingModal booking={selectedBooking} notes={notes} onClose={() => setSelectedBooking(null)} onAddNote={handleAddNote} onAssignReason={handleAssignReason} onDeleteNote={handleDeleteNote} />
      )}
      {lateDrawer && (
        <LateDrawer title={lateDrawer.title} bookings={lateDrawer.bookings} notes={notes} onClose={() => setLateDrawer(null)} onSelect={(b) => { setLateDrawer(null); setSelectedBooking(b); }} />
      )}
    </div>
  );
}
