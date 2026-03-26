import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

export function useDeliveryData() {
  const [deliveries, setDeliveries] = useState([]);
  const [notes, setNotes] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDeliveries = useCallback(async () => {
    const { data, error } = await supabase
      .from('delivery_summary')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      // Fallback to raw deliveries table if view doesn't exist
      const { data: rawData, error: rawError } = await supabase
        .from('deliveries')
        .select('*')
        .order('date', { ascending: false });

      if (rawError) {
        setError(rawError.message);
        return;
      }

      setDeliveries(transformRawDeliveries(rawData));
      return;
    }

    setDeliveries(transformViewDeliveries(data));
  }, []);

  const fetchNotes = useCallback(async () => {
    const { data, error } = await supabase
      .from('delivery_notes')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching notes:', error);
      return;
    }

    setNotes(data.map(n => ({
      id: n.id,
      bookingRef: n.booking_ref,
      note: n.note,
      author: n.author || 'User',
      timestamp: n.created_at,
    })));
  }, []);

  const fetchLastSync = useCallback(async () => {
    const { data } = await supabase
      .from('sync_log')
      .select('completed_at, rows_synced, status')
      .eq('status', 'success')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (data) setLastSync(data);
  }, []);

  const addNote = useCallback(async (bookingRef, noteText, author = 'User') => {
    const { data, error } = await supabase
      .from('delivery_notes')
      .insert({
        booking_ref: bookingRef,
        note: noteText,
        author: author,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding note:', error);
      return;
    }

    setNotes(prev => [...prev, {
      id: data.id,
      bookingRef: data.booking_ref,
      note: data.note,
      author: data.author,
      timestamp: data.created_at,
    }]);
  }, []);

  const deleteNote = useCallback(async (noteId) => {
    const { error } = await supabase
      .from('delivery_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      console.error('Error deleting note:', error);
      return;
    }

    setNotes(prev => prev.filter(n => n.id !== noteId));
  }, []);

  // Initial load
  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      await Promise.all([fetchDeliveries(), fetchNotes(), fetchLastSync()]);
      setLoading(false);
    }
    loadAll();
  }, [fetchDeliveries, fetchNotes, fetchLastSync]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDeliveries();
      fetchNotes();
      fetchLastSync();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDeliveries, fetchNotes, fetchLastSync]);

  // Real-time subscription for notes
  useEffect(() => {
    const channel = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'delivery_notes' },
        (payload) => {
          const n = payload.new;
          setNotes(prev => {
            // Avoid duplicates
            if (prev.some(p => p.timestamp === n.created_at && p.note === n.note && p.bookingRef === n.booking_ref)) {
              return prev;
            }
            return [...prev, {
              id: n.id,
              bookingRef: n.booking_ref,
              note: n.note,
              author: n.author || 'User',
              timestamp: n.created_at,
            }];
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return { deliveries, notes, lastSync, loading, error, addNote, deleteNote, refresh: fetchDeliveries };
}

// Transform from the delivery_summary view
function transformViewDeliveries(data) {
  return data.map(d => ({
    bookingRef: d.booking_ref,
    po: d.po || '',
    courier: d.courier || '',
    pickupAddress: d.pickup_address || '',
    dropAddress: d.drop_address || '',
    date: d.date,
    state: d.state || '',
    speed: d.speed || '',
    distanceKm: parseFloat(d.distance_km) || 0,
    hour: d.hour || 0,
    status: d.status || '',
    requestedDrop: d.requested_drop,
    requestedPickup: d.requested_pickup,
    dropActual: d.drop_actual,
    attempted: d.attempted,
    customer: d.customer || classifyCustomer(d.po),
    slaMins: d.sla_mins || calcSLA(d.speed, d.distance_km),
    expectedDelivery: d.expected_delivery ? new Date(d.expected_delivery) : calcExpectedDelivery(d),
    isLate: d.is_late || false,
    isOnTime: d.status === 'Dropped Off' && !(d.is_late || false),
    delayMins: d.delay_mins ? Math.max(0, parseFloat(d.delay_mins)) : 0,
    pickupToDeliveryMins: calcPickupToDelivery(d.drop_actual, d.requested_pickup),
    bookingToPickup: calcBookingToPickup(d.requested_pickup, d.date, d.hour),
  }));
}

// Transform from raw deliveries table (fallback)
function transformRawDeliveries(data) {
  return data.map(d => {
    const slaMins = calcSLA(d.speed, d.distance_km);
    const expectedDelivery = calcExpectedDelivery(d);
    const actualDrop = d.drop_actual ? new Date(d.drop_actual) : null;
    let isLate = false;
    let delayMins = 0;

    if (d.status === 'Dropped Off' && actualDrop && expectedDelivery) {
      delayMins = (actualDrop - expectedDelivery) / 60000;
      isLate = delayMins > 0;
    }

    return {
      bookingRef: d.booking_ref,
      po: d.po || '',
      courier: d.courier || '',
      pickupAddress: d.pickup_address || '',
      dropAddress: d.drop_address || '',
      date: d.date,
      state: d.state || '',
      speed: d.speed || '',
      distanceKm: parseFloat(d.distance_km) || 0,
      hour: d.hour || 0,
      status: d.status || '',
      requestedDrop: d.requested_drop,
      requestedPickup: d.requested_pickup,
      dropActual: d.drop_actual,
      attempted: d.attempted,
      customer: classifyCustomer(d.po),
      slaMins,
      expectedDelivery,
      isLate: d.status === 'Dropped Off' ? isLate : false,
      isOnTime: d.status === 'Dropped Off' ? !isLate : false,
      delayMins: d.status === 'Dropped Off' ? Math.max(0, delayMins) : 0,
      pickupToDeliveryMins: calcPickupToDelivery(d.drop_actual, d.requested_pickup),
      bookingToPickup: calcBookingToPickup(d.requested_pickup, d.date, d.hour),
    };
  });
}

function classifyCustomer(po) {
  const p = po || '';
  return (p.startsWith('ANC') || p.startsWith('A&C') || p.startsWith('FBAU')) ? 'Fuji' : 'Droppoint';
}

function calcSLA(speed, distanceKm) {
  if (speed === 'VIP') {
    if (distanceKm <= 30) return 90;
    if (distanceKm <= 50) return 120;
    return 150;
  }
  if (speed === '3 hour') return 180;
  return null;
}

function calcExpectedDelivery(d) {
  if (d.speed === 'Same day') {
    return d.requested_drop ? new Date(d.requested_drop) : null;
  }
  const reqPickup = d.requested_pickup ? new Date(d.requested_pickup) : null;
  const slaMins = calcSLA(d.speed, d.distance_km);
  if (reqPickup && slaMins) {
    return new Date(reqPickup.getTime() + slaMins * 60000);
  }
  return null;
}

function calcPickupToDelivery(dropActual, requestedPickup) {
  if (dropActual && requestedPickup) {
    return (new Date(dropActual) - new Date(requestedPickup)) / 60000;
  }
  return null;
}

function calcBookingToPickup(requestedPickup, date, hour) {
  if (requestedPickup && date) {
    const bTime = new Date(date);
    bTime.setHours(hour || 0, 0, 0, 0);
    return (new Date(requestedPickup) - bTime) / 60000;
  }
  return null;
}
