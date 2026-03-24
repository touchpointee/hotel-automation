import { connectDB } from '@/lib/db';
import Booking from '@/models/Booking';
import { generateOTP } from '@/lib/otp';
import { normalizeBookingPayload } from '@/lib/bookingMapper';

// GET - list bookings with optional filters
export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const filter = {};

  const source = searchParams.get('source');
  const status = searchParams.get('status');
  const checkInFrom = searchParams.get('checkInFrom');
  const checkInTo = searchParams.get('checkInTo');
  const roomNo = searchParams.get('room_no');

  if (source) filter.source = source;
  if (status) filter.status = status;
  if (roomNo) filter.room_no = roomNo;
  if (checkInFrom || checkInTo) {
    filter.check_in = {};
    if (checkInFrom) filter.check_in.$gte = checkInFrom;
    if (checkInTo) filter.check_in.$lte = checkInTo;
  }

  const bookings = await Booking.find(filter).sort({ createdAt: -1 });
  return Response.json({ bookings });
}

// POST - create new booking (supports both kiosk-style and OTA-style)
export async function POST(request) {
  await connectDB();
  const body = await request.json();
  const normalized = normalizeBookingPayload(body);
  const { guest_name, guest_phone, room_no, check_in, check_out } = normalized;

  if (!guest_name || !guest_phone || !room_no || !check_in || !check_out) {
    return Response.json({ error: 'All fields required' }, { status: 400 });
  }

  // Generate OTP only for direct/offline bookings (kiosk workflow)
  let otp = null;
  const source = normalized.source || 'direct';
  if (source === 'direct' || source === 'offline') {
    let exists = true;
    while (exists) {
      otp = generateOTP();
      exists = await Booking.findOne({ otp });
    }
  }

  let booking;
  if (normalized.external_booking_id && source !== 'direct' && source !== 'offline') {
    booking = await Booking.findOneAndUpdate(
      { source, external_booking_id: normalized.external_booking_id },
      {
        $set: {
          ...normalized,
          otp,
          sync_status: 'success',
          last_synced_at: new Date(),
        },
        $setOnInsert: {
          id_proof_status: 'unuploaded',
          upload_session_active: false,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
  } else {
    booking = await Booking.create({
      ...normalized,
      otp,
      sync_status: normalized.sync_status || 'success',
    });
  }

  return Response.json({ booking }, { status: 201 });
}

