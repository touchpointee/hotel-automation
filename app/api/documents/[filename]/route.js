import { NextResponse } from 'next/server';
import { createReadStream, statSync, existsSync } from 'fs';
import path from 'path';
import { getDocumentObjectStream, getContentTypeForFilename } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    const { filename } = params;
    
    // Ensure filename doesn't contain directory traversal sequences
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new NextResponse('Invalid filename', { status: 400 });
    }

    const isDownload = req.nextUrl.searchParams.get('download') === 'true';

    // Prefer Garage/S3 if configured.
    const s3Obj = await getDocumentObjectStream({ key: filename });
    if (s3Obj.found) {
      return new NextResponse(s3Obj.body, {
        status: 200,
        headers: {
          'Content-Type': s3Obj.contentType || getContentTypeForFilename(filename),
          ...(typeof s3Obj.contentLength === 'number' ? { 'Content-Length': String(s3Obj.contentLength) } : {}),
          'Content-Disposition': `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`,
          'Cache-Control': 'private, no-store',
        },
      });
    }

    // Fallback to local filesystem.
    const filepath = path.join(process.cwd(), 'documents', filename);
    if (!existsSync(filepath)) {
      return new NextResponse('Document not found', { status: 404 });
    }

    const stats = statSync(filepath);
    const stream = createReadStream(filepath);
    const contentType = getContentTypeForFilename(filename);

    // Return the file stream
    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size,
        'Content-Disposition': `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      }
    });

  } catch (error) {
    console.error('Document fetch error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
