import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { connectDB } from '@/lib/db';
import Booking from '@/models/Booking';
import { putDocumentObject, getContentTypeForFilename } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    await connectDB();
    const formData = await req.formData();
    
    const files = formData.getAll('file');
    const otp = formData.get('otp');

    if (!files || files.length === 0 || !otp) {
      return NextResponse.json({ error: 'Missing file or booking OTP.' }, { status: 400 });
    }

    const booking = await Booking.findOne({ otp });
    if (!booking) {
      return NextResponse.json({ error: 'Valid booking not found for this code.' }, { status: 404 });
    }

    if (!booking.upload_session_active) {
      return NextResponse.json({ error: 'Upload link is currently inactive. Please ensure the QR code is visible on the Kiosk.' }, { status: 403 });
    }

    const uploadedFilenames = [];

    // Upload each file and append to booking.id_proofs
    for (const file of files) {
      if (!file) continue;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Construct filename securely
      const originalName = file.name || '';
      const rawExt = originalName.split('.').pop() || 'jpg';
      const ext = String(rawExt).toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const filename = `id_proof_${booking._id}_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
      const contentType = getContentTypeForFilename(filename);

      // Prefer MinIO/Garage if configured; otherwise fall back to local filesystem.
      const s3Result = await putDocumentObject({ key: filename, body: buffer, contentType });
      if (!s3Result.stored) {
        const uploadDir = path.join(process.cwd(), 'documents');
        if (!existsSync(uploadDir)) {
          await fs.mkdir(uploadDir, { recursive: true });
        }
        const filepath = path.join(uploadDir, filename);
        await fs.writeFile(filepath, buffer);
      }

      uploadedFilenames.push(filename);
    }

    if (uploadedFilenames.length === 0) {
      return NextResponse.json({ error: 'No valid files provided.' }, { status: 400 });
    }

    // Update booking in DB (backward compatible: keep latest in id_proof)
    booking.id_proofs = [...(booking.id_proofs || []), ...uploadedFilenames];
    booking.id_proof = uploadedFilenames[uploadedFilenames.length - 1];

    // We do NOT set id_proof_status = 'uploaded' here anymore.
    // The mobile phone must explicitly call confirm_upload.
    await booking.save();

    return NextResponse.json({
      success: true,
      message: 'ID proof uploaded successfully',
      filename: booking.id_proof,
      filenames: uploadedFilenames,
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Internal server error while uploading.' }, { status: 500 });
  }
}
