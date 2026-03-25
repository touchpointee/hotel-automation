import { connectDB } from '@/lib/db';
import Booking from '@/models/Booking';
import Room from '@/models/Room';

// GET - fetch booking details by id (used by admin booking detail page)
export async function GET(request, { params }) {
  await connectDB();
  const { id } = params;

  if (!id) {
    return Response.json({ error: 'Booking ID is required' }, { status: 400 });
  }

  const booking = await Booking.findById(id);
  if (!booking) {
    return Response.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Optional directions for UI (floor + room directions)
  let directions = null;
  if (booking.room_no) {
    const roomMapping = await Room.findOne({ room_no: booking.room_no }).populate('floor_id');
    if (roomMapping?.floor_id) {
      directions = roomMapping.directions
        ? `${roomMapping.floor_id.directions} -> ${roomMapping.directions}`
        : roomMapping.floor_id.directions;
    }
  }

  return Response.json({ booking, directions });
}

// PUT - update an existing booking
export async function PUT(request, { params }) {
  await connectDB();
  const { id } = params;
  
  if (!id) {
    return Response.json({ error: 'Booking ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    
    // We update the booking avoiding to override otp
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updatedBooking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    return Response.json({ booking: updatedBooking });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - remove a booking
export async function DELETE(request, { params }) {
  await connectDB();
  const { id } = params;

  if (!id) {
    return Response.json({ error: 'Booking ID is required' }, { status: 400 });
  }

  try {
    const deletedBooking = await Booking.findByIdAndDelete(id);
    
    if (!deletedBooking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    return Response.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
