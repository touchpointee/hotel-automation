import { connectDB } from '@/lib/db';
import Room from '@/models/Room';

// GET - get a single room by _id
export async function GET(request, { params }) {
  await connectDB();
  const { id } = params;
  try {
    const room = await Room.findById(id).populate('floor_id');
    if (!room) return Response.json({ error: 'Room not found' }, { status: 404 });
    return Response.json({ room });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// PUT - update an existing room mapping
export async function PUT(request, { params }) {
  await connectDB();
  const { id } = params;

  if (!id) {
    return Response.json({ error: 'Room ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updatedRoom = await Room.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updatedRoom) {
      return Response.json({ error: 'Room not found' }, { status: 404 });
    }

    return Response.json({ room: updatedRoom });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - remove a room
export async function DELETE(request, { params }) {
  await connectDB();
  const { id } = params;

  if (!id) {
    return Response.json({ error: 'Room ID is required' }, { status: 400 });
  }

  try {
    const deletedRoom = await Room.findByIdAndDelete(id);
    if (!deletedRoom) {
      return Response.json({ error: 'Room not found' }, { status: 404 });
    }

    return Response.json({ message: 'Room deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
