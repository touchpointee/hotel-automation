import { connectDB } from '@/lib/db';
import Room from '@/models/Room';
import Floor from '@/models/Floor'; // Ensure it's imported for population

// GET - list all rooms
export async function GET() {
  await connectDB();
  const rooms = await Room.find().populate('floor_id').sort({ room_no: 1 });
  return Response.json({ rooms });
}

// POST - create new room
export async function POST(request) {
  await connectDB();
  const body = await request.json();
  const { room_no, floor_id, directions, name, description, price_per_night, max_guests, amenities, room_status } = body;

  if (!room_no) {
    return Response.json({ error: 'Room number is required' }, { status: 400 });
  }

  try {
    const existing = await Room.findOne({ room_no });
    if (existing) {
      return Response.json({ error: 'Room number already exists' }, { status: 409 });
    }

    const room = await Room.create({
      room_no,
      floor_id: floor_id || undefined,
      directions: directions || '',
      name: name || room_no,
      description,
      price_per_night,
      max_guests: max_guests || 2,
      amenities: amenities || [],
      room_status: room_status || 'active',
      ical_sources: [],
    });

    const populatedRoom = await Room.findById(room._id).populate('floor_id');
    return Response.json({ room: populatedRoom }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

