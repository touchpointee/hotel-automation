import { connectDB } from '@/lib/db';
import Booking from '@/models/Booking';
import { generateOTP } from '@/lib/otp';

/**
 * POST /api/bookings/[id]/confirm
 * Confirms an OTA-sourced pending booking:
 *   - Assigns/updates the room
 *   - Auto-generates a unique OTP (for kiosk check-in)
 *   - Sets status to 'confirmed'
 */
export async function POST(request, { params }) {
  await connectDB();
  const { id } = params;

  try {
    const { room_no } = await request.json();

    if (!room_no) {
      return Response.json({ error: 'room_no is required' }, { status: 400 });
    }

    const booking = await Booking.findById(id);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    if (booking.otp) {
      // Already confirmed — just return current state
      return Response.json({ booking });
    }

    // Generate a unique OTP
    let otp;
    let exists = true;
    while (exists) {
      otp = generateOTP();
      exists = await Booking.findOne({ otp });
    }

    const updated = await Booking.findByIdAndUpdate(
      id,
      {
        $set: {
          room_no,
          otp,
          status: 'confirmed',
        },
      },
      { new: true }
    );

    return Response.json({ booking: updated, otp });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
