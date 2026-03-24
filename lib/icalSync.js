import ICAL from 'ical.js';
import { connectDB } from '@/lib/db';
import Booking from '@/models/Booking';
import Room from '@/models/Room';
import { normalizeSource } from '@/lib/bookingMapper';

const FETCH_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

function mapPlatformToSource(platform) {
  return normalizeSource(platform);
}

function formatDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

async function fetchIcal(url) {
  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HotelChannelManager/1.0)',
          Accept: 'text/calendar, text/plain, */*',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text.trim().startsWith('<') || text.includes('<!DOCTYPE')) {
        throw new Error('Got HTML instead of iCal (auth or blocked)');
      }
      return text;
    } catch (err) {
      if (attempt === FETCH_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}

function parseIcalString(icalString) {
  const events = [];
  try {
    const jcal = ICAL.parse(icalString);
    const comp = new ICAL.Component(jcal);
    const vevents = comp.getAllSubcomponents('vevent');
    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);
      const start = event.startDate?.toJSDate();
      const end = event.endDate?.toJSDate();
      if (start && end) {
        events.push({
          uid: event.uid || null,
          start,
          end,
          summary: event.summary,
          description: event.description,
          status: vevent.getFirstPropertyValue('status') || null,
          sequence: vevent.getFirstPropertyValue('sequence') || null,
        });
      }
    }
  } catch {
    // ignore parse errors
  }
  return events;
}

function guestNameFromEvent(ev, platform) {
  const generic = ['blocked', 'reservation', 'booking', 'unavailable', 'not available'];
  const s = (ev.summary || '').trim();
  if (s && !generic.some((g) => s.toLowerCase().includes(g))) return s;
  const d = (ev.description || '').trim();
  if (d && d.length < 100) return d;
  return `${platform} booking`;
}

async function syncRoomSource(room, source, sourceIndex) {
  const icalString = await fetchIcal(source.url);
  const events = parseIcalString(icalString);
  const bookingSource = mapPlatformToSource(source.platform);
  const roomNo = room.room_no;
  let synced = 0;

  for (const ev of events) {
    const guestName = guestNameFromEvent(ev, source.platform);
    const checkInStr = formatDateStr(ev.start);
    const checkOutStr = formatDateStr(ev.end);
    const externalBookingId = ev.uid || `${bookingSource}-${roomNo}-${checkInStr}`;
    const channelStatus = String(ev.status || '').toLowerCase().includes('cancel') ? 'cancelled' : 'confirmed';
    const status = channelStatus === 'cancelled' ? 'cancelled' : 'pending';

    await Booking.findOneAndUpdate(
      { source: bookingSource, external_booking_id: externalBookingId },
      {
        $setOnInsert: {
          room_no: roomNo,
          source: bookingSource,
          guest_phone: '-',
          otp: null,
          id_proof_status: 'unuploaded',
          upload_session_active: false,
        },
        $set: {
          external_id: externalBookingId,
          external_booking_id: externalBookingId,
          channel: source.platform || bookingSource,
          check_in: checkInStr,
          check_out: checkOutStr,
          guest_name: guestName,
          status,
          channel_status: channelStatus,
          sync_status: 'success',
          last_synced_at: new Date(),
          raw_payload: ev,
        },
      },
      { upsert: true, new: true }
    );
    synced++;
  }

  // Update syncStatus on the room
  const updateKey = `ical_sources.${sourceIndex}.lastSynced`;
  const statusKey = `ical_sources.${sourceIndex}.syncStatus`;
  await Room.updateOne(
    { _id: room._id },
    { $set: { [updateKey]: new Date(), [statusKey]: 'success' } }
  );

  return { synced, platform: source.platform };
}

export async function runIcalSync() {
  await connectDB();
  const rooms = await Room.find({
    room_status: { $ne: 'inactive' },
    'ical_sources.url': { $exists: true, $ne: '' },
  }).lean();

  const results = [];
  for (const room of rooms) {
    const sources = room.ical_sources || [];
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      if (!src?.url?.trim()) continue;
      try {
        const r = await syncRoomSource(room, src, i);
        results.push({ roomNo: room.room_no, ...r, status: 'ok' });
      } catch (err) {
        // Mark failed
        const statusKey = `ical_sources.${i}.syncStatus`;
        await Room.updateOne({ _id: room._id }, { $set: { [statusKey]: 'failed' } });
        results.push({ roomNo: room.room_no, platform: src.platform, status: 'error', error: err.message });
      }
    }
  }
  return results;
}
