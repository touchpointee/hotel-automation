function normalizeSource(source = '') {
  const lower = String(source).toLowerCase();
  if (lower.includes('airbnb')) return 'airbnb';
  if (lower.includes('booking')) return 'booking.com';
  if (lower.includes('goibibo')) return 'goibibo';
  if (lower.includes('makemytrip')) return 'makemytrip';
  if (lower.includes('agoda')) return 'agoda';
  if (lower.includes('expedia')) return 'expedia';
  if (lower.includes('hostelworld')) return 'hostelworld';
  if (lower.includes('offline')) return 'offline';
  return 'direct';
}

function normalizeBookingPayload(payload = {}) {
  const source = normalizeSource(payload.source || payload.platform || payload.channel);
  const externalBookingId = payload.external_booking_id || payload.externalId || payload.external_id || payload.uid || null;

  return {
    guest_name: payload.guest_name || payload.guestName || '',
    guest_phone: payload.guest_phone || payload.guestPhone || '-',
    guest_email: payload.guest_email || payload.guestEmail || undefined,
    room_no: payload.room_no || payload.roomNumber || payload.roomNo || '',
    check_in: payload.check_in || payload.checkIn || '',
    check_out: payload.check_out || payload.checkOut || '',
    source,
    channel: payload.channel || payload.platform || source,
    external_booking_id: externalBookingId,
    external_id: payload.external_id || externalBookingId || undefined,
    status: payload.status || 'pending',
    payment_status: payload.payment_status || payload.paymentStatus || 'pending',
    amount: payload.amount,
    currency: payload.currency || 'INR',
    taxes: payload.taxes,
    fees: payload.fees,
    total_amount: payload.total_amount || payload.totalAmount,
    number_of_guests: payload.number_of_guests || payload.numberOfGuests || 1,
    notes: payload.notes,
    channel_status: payload.channel_status || payload.channelStatus || 'unknown',
    sync_status: payload.sync_status || payload.syncStatus || 'pending',
    last_synced_at: payload.last_synced_at || payload.lastSyncedAt || new Date(),
    raw_payload: payload.raw_payload || payload.rawPayload || payload,
  };
}

export { normalizeSource, normalizeBookingPayload };
