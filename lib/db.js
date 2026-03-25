import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose || { conn: null, promise: null };
global.mongoose = cached;

async function ensureBookingIndexes(conn) {
  // Run once per process
  if (cached._bookingIndexChecked) return;
  cached._bookingIndexChecked = true;

  try {
    const db = conn.connection?.db;
    if (!db) return;

    const bookings = db.collection('bookings');
    const indexes = await bookings.indexes();
    const bad = indexes.find((idx) => idx?.name === 'source_1_external_booking_id_1' && idx?.unique);

    // If the old unique index exists (it treats null as a value), drop it and recreate with partial filter.
    if (bad) {
      await bookings.dropIndex('source_1_external_booking_id_1');
    }

    await bookings.createIndex(
      { source: 1, external_booking_id: 1 },
      {
        name: 'source_1_external_booking_id_1',
        unique: true,
        partialFilterExpression: { external_booking_id: { $exists: true, $type: 'string', $ne: '' } },
      }
    );
  } catch (e) {
    // Don't block app startup if index ops fail; API routes will still work without this migration.
    console.warn('[DB] booking index ensure failed:', e?.message || e);
  }
}

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set. Add your MongoDB connection string in environment variables (e.g. Coolify / .env.local).'
    );
  }
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then(m => m);
  }
  cached.conn = await cached.promise;
  await ensureBookingIndexes(cached.conn);
  return cached.conn;
}
