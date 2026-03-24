import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { connectDB } from '@/lib/db';
import Booking from '@/models/Booking';

export async function POST(req) {
  try {
    await connectDB();
    const formData = await req.formData();
    
    const file = formData.get('file');
    const otp = formData.get('otp');

    if (!file || !otp) {
      return NextResponse.json({ error: 'Missing file or booking OTP.' }, { status: 400 });
    }

    const booking = await Booking.findOne({ otp });
    if (!booking) {
      return NextResponse.json({ error: 'Valid booking not found for this code.' }, { status: 404 });
    }

    if (!booking.upload_session_active) {
      return NextResponse.json({ error: 'Upload link is currently inactive. Please ensure the QR code is visible on the Kiosk.' }, { status: 403 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to documents/ folder
    const uploadDir = path.join(process.cwd(), 'documents');
    
    // Create documents folder if missing
    if (!existsSync(uploadDir)) {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    // Construct filename securely
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `id_proof_${booking._id}_${Date.now()}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Write file
    await fs.writeFile(filepath, buffer);

    // Update booking in DB
    booking.id_proof = filename;
    // We do NOT set id_proof_status = 'uploaded' here anymore. 
    // The mobile phone must explicitly call confirm_upload.
    await booking.save();

    return NextResponse.json({ success: true, message: 'ID proof uploaded successfully', filename });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Internal server error while uploading.' }, { status: 500 });
  }
}
