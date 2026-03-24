import { connectDB } from '@/lib/db';
import Booking from '@/models/Booking';
import Room from '@/models/Room';
import Floor from '@/models/Floor';
import { issueKeyCard } from '@/lib/yale';

// POST - guest submits OTP, lookup booking
export async function POST(request) {
  await connectDB();
  const { otp, action } = await request.json();

  if (!otp) return Response.json({ error: 'OTP required' }, { status: 400 });

  // Only match bookings that have an OTP (OTA-synced bookings have otp=null and can't be kiosk checked in)
  const trimmedOtp = otp.trim();
  const booking = await Booking.findOne({ otp: trimmedOtp, $expr: { $ne: ['$otp', null] } });
  if (!booking) return Response.json({ error: 'Invalid code. Please check and try again.' }, { status: 404 });
  if (booking.status === 'checked_in') return Response.json({ error: 'Already checked in.' }, { status: 409 });
  if (booking.status === 'checked_out' || booking.status === 'checked-out') return Response.json({ error: 'This booking is checked out.' }, { status: 409 });

  const now = new Date();
  const checkoutDate = new Date(booking.check_out);
  if (now > checkoutDate) {
    return Response.json({ error: 'This booking has expired (Checkout time passed).' }, { status: 403 });
  }

  // action=lookup → just return booking details for confirmation
  if (action === 'lookup') {
    return Response.json({
      booking: {
        guest_name: booking.guest_name,
        room_no: booking.room_no,
        check_in: booking.check_in,
        check_out: booking.check_out,
        otp: booking.otp,
      }
    });
  }

  // action=confirm → issue card via Yale API
  if (action === 'confirm') {
    try {
      const cardDetail = await issueKeyCard({
        room_no: booking.room_no,
        begin_time: booking.check_in,
        end_time: booking.check_out,
      });

      await Booking.findByIdAndUpdate(booking._id, {
        status: 'checked_in',
        card_no: cardDetail.card_no,
        card_id: cardDetail.card_id,
        checked_in_at: new Date(),
      });

      const roomMapping = await Room.findOne({ room_no: booking.room_no }).populate('floor_id');

      let finalDirections = 'Please ask the front desk for directions to your room.';
      if (roomMapping && roomMapping.floor_id) {
        finalDirections = roomMapping.directions 
          ? `${roomMapping.floor_id.directions} -> ${roomMapping.directions}`
          : roomMapping.floor_id.directions;
      }

      return Response.json({
        success: true,
        guest_name: booking.guest_name,
        room_no: booking.room_no,
        check_out: booking.check_out,
        directions: finalDirections,
      });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  if (action === 'start_upload') {
    await Booking.findByIdAndUpdate(booking._id, { upload_session_active: true });
    return Response.json({ success: true });
  }

  if (action === 'stop_upload') {
    await Booking.findByIdAndUpdate(booking._id, { upload_session_active: false });
    return Response.json({ success: true });
  }

  // action=check_upload → check if guest uploaded ID from phone
  if (action === 'check_upload') {
    return Response.json({ uploaded: booking.id_proof_status === 'uploaded' });
  }

  if (action === 'check_session') {
    return Response.json({ active: booking.upload_session_active });
  }

  if (action === 'confirm_upload') {
    await Booking.findByIdAndUpdate(booking._id, { id_proof_status: 'uploaded' });
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
}
