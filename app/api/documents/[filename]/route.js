import { NextResponse } from 'next/server';
import { createReadStream, statSync, existsSync } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    const { filename } = params;
    
    // Ensure filename doesn't contain directory traversal sequences
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new NextResponse('Invalid filename', { status: 400 });
    }

    const filepath = path.join(process.cwd(), 'documents', filename);

    if (!existsSync(filepath)) {
      return new NextResponse('Document not found', { status: 404 });
    }

    const stats = statSync(filepath);
    const stream = createReadStream(filepath);

    const isDownload = req.nextUrl.searchParams.get('download') === 'true';

    // Determine content type
    let contentType = 'application/octet-stream';
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (filename.endsWith('.png')) contentType = 'image/png';
    else if (filename.endsWith('.webp')) contentType = 'image/webp';
    else if (filename.endsWith('.pdf')) contentType = 'application/pdf';

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
