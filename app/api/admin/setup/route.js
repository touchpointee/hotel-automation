import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';

// This route should be deleted after creating the first admin user!
// GET /api/admin/setup
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  // Simple protection - require a setup secret
  if (secret !== 'setup2024') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();

  const existing = await User.findOne({ username: 'admin' });
  if (existing) {
    return NextResponse.json({ message: 'Admin user already exists' });
  }

  const hashed = await hashPassword('admin123');
  await User.create({ username: 'admin', password: hashed, role: 'admin' });
  
  return NextResponse.json({ 
    success: true, 
    message: 'Admin user created! Username: admin, Password: admin123. Delete this route after setup.' 
  });
}
