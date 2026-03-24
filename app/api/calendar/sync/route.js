import { NextResponse } from 'next/server';
import { runIcalSync } from '@/lib/icalSync';

export async function POST() {
  try {
    const results = await runIcalSync();
    return NextResponse.json({ success: true, results });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
