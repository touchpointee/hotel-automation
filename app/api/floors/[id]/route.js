import { connectDB } from '@/lib/db';
import Floor from '@/models/Floor';
import Room from '@/models/Room';

// PUT - update an existing floor
export async function PUT(request, { params }) {
  await connectDB();
  const { id } = params;

  if (!id) return Response.json({ error: 'Floor ID is required' }, { status: 400 });

  try {
    const body = await request.json();
    const updatedFloor = await Floor.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true });

    if (!updatedFloor) return Response.json({ error: 'Floor not found' }, { status: 404 });

    return Response.json({ floor: updatedFloor });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - remove a floor
export async function DELETE(request, { params }) {
  await connectDB();
  const { id } = params;

  if (!id) return Response.json({ error: 'Floor ID is required' }, { status: 400 });

  try {
    // Check if rooms depend on this floor
    const dependentRooms = await Room.countDocuments({ floor_id: id });
    if (dependentRooms > 0) {
      return Response.json({ error: 'Cannot delete floor because it has rooms attached. Reassign or delete the rooms first.' }, { status: 409 });
    }

    const deletedFloor = await Floor.findByIdAndDelete(id);
    if (!deletedFloor) return Response.json({ error: 'Floor not found' }, { status: 404 });

    return Response.json({ message: 'Floor deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
