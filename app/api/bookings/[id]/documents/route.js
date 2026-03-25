import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

import { connectDB } from '@/lib/db';
import Booking from '@/models/Booking';
import { putDocumentObject, getContentTypeForFilename } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  try {
    await connectDB();

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const originalName = file.name || '';
    const rawExt = originalName.split('.').pop() || 'jpg';
    const ext = String(rawExt).toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';

    const filename = `id_proof_${booking._id}_${Date.now()}.${ext}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const contentType = getContentTypeForFilename(filename);

    // Prefer Garage/S3 if configured; otherwise fall back to local filesystem.
    const s3Result = await putDocumentObject({ key: filename, body: buffer, contentType });
    if (!s3Result.stored) {
      const uploadDir = path.join(process.cwd(), 'documents');
      if (!existsSync(uploadDir)) {
        await fs.mkdir(uploadDir, { recursive: true });
      }
      const filepath = path.join(uploadDir, filename);
      await fs.writeFile(filepath, buffer);
    }

    booking.id_proof = filename;
    booking.id_proof_status = 'uploaded';
    booking.upload_session_active = false;
    await booking.save();

    return NextResponse.json({
      success: true,
      booking: {
        _id: booking._id,
        id_proof: booking.id_proof,
        id_proof_status: booking.id_proof_status,
      },
      filename,
    });
  } catch (error) {
    console.error('Booking document upload error:', error);
    return NextResponse.json({ error: 'Internal server error while uploading.' }, { status: 500 });
  }
}

