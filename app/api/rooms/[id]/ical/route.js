import { connectDB } from '@/lib/db';
import Room from '@/models/Room';

// PUT /api/rooms/[id]/ical -- update iCal sources for a room
export async function PUT(request, { params }) {
  await connectDB();
  const { id } = params;
  try {
    const { icalSources } = await request.json();
    const room = await Room.findByIdAndUpdate(
      id,
      { $set: { ical_sources: icalSources } },
      { new: true, runValidators: true }
    );
    if (!room) return Response.json({ error: 'Room not found' }, { status: 404 });
    return Response.json({ room });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
