import { connectDB } from '@/lib/db';
import Room from '@/models/Room';
import Booking from '@/models/Booking';

// Generate a minimal valid iCalendar file for a room's confirmed bookings
export async function GET(request, { params }) {
  await connectDB();
  const { roomId } = params;

  const room = await Room.findOne({ room_no: roomId }).lean();
  if (!room) {
    // Try by _id
    const byId = await Room.findById(roomId).lean().catch(() => null);
    if (!byId) {
      return new Response('Room not found', { status: 404 });
    }
  }

  const bookings = await Booking.find({
    room_no: (room || { room_no: roomId }).room_no,
    status: { $nin: ['cancelled', 'checked_out', 'checked-out'] },
  }).lean();

  const now = new Date();
  const dtStamp = formatIcalDate(now);

  let events = '';
  for (const b of bookings) {
    const uid = `booking-${b._id}@hotelmvp`;
    const dtStart = formatIcalDateOnly(new Date(b.check_in));
    const dtEnd   = formatIcalDateOnly(new Date(b.check_out));
    events += [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${b.guest_name}`,
      `STATUS:CONFIRMED`,
      'END:VEVENT',
    ].join('\r\n') + '\r\n';
  }

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HotelMVP//BookingCalendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    events.trim(),
    'END:VCALENDAR',
  ].join('\r\n');

  return new Response(ical, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="room-${roomId}.ics"`,
    },
  });
}

function formatIcalDate(d) {
  return d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
}

function formatIcalDateOnly(d) {
  if (isNaN(d.getTime())) return '20000101';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}
