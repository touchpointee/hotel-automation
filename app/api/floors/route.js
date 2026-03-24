import { connectDB } from '@/lib/db';
import Floor from '@/models/Floor';

// GET - list all floors
export async function GET() {
  await connectDB();
  const floors = await Floor.find().sort({ createdAt: 1 });
  return Response.json({ floors });
}

// POST - create new floor
export async function POST(request) {
  await connectDB();
  const body = await request.json();
  const { name, directions } = body;

  if (!name || !directions) {
    return Response.json({ error: 'All fields required' }, { status: 400 });
  }

  try {
    const existing = await Floor.findOne({ name });
    if (existing) {
      return Response.json({ error: 'Floor already exists' }, { status: 409 });
    }

    const floor = await Floor.create({ name, directions });
    return Response.json({ floor }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
