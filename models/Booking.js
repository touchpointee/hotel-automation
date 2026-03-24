import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
  // Core fields (kiosk / existing)
  guest_name:   { type: String, required: true },
  guest_phone:  { type: String, required: true },
  room_no:      { type: String, required: true },
  check_in:     { type: String, required: true }, // "yyyy-MM-dd HH:mm"
  check_out:    { type: String, required: true }, // "yyyy-MM-dd HH:mm"
  otp:          { type: String, default: null },
  external_id:  { type: String }, // legacy UID support
  external_booking_id: { type: String },
  status:       { type: String, enum: ['pending', 'checked_in', 'checked_out', 'confirmed', 'cancelled', 'checked-out'], default: 'pending' },
  card_no:      { type: Number },
  card_id:      { type: Number },
  checked_in_at: { type: Date },
  id_proof:     { type: String },
  id_proof_status: { type: String, enum: ['unuploaded', 'uploaded'], default: 'unuploaded' },
  upload_session_active: { type: Boolean, default: false },

  // OTA / Channel Manager fields
  source: {
    type: String,
    enum: ['direct', 'airbnb', 'booking.com', 'goibibo', 'makemytrip', 'agoda', 'expedia', 'hostelworld', 'offline'],
    default: 'direct',
  },
  channel: { type: String },
  channel_status: { type: String, enum: ['confirmed', 'modified', 'cancelled', 'unknown'], default: 'unknown' },
  guest_email:      { type: String },
  number_of_guests: { type: Number, default: 1 },
  payment_status:   { type: String, enum: ['paid', 'pending', 'partial'], default: 'pending' },
  amount:           { type: Number },
  currency:         { type: String, default: 'INR' },
  taxes:            { type: Number },
  fees:             { type: Number },
  total_amount:     { type: Number },
  notes:            { type: String },
  last_synced_at:   { type: Date },
  sync_status:      { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  raw_payload:      { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

BookingSchema.index({ source: 1, external_booking_id: 1 }, { unique: true, sparse: true });

export default mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
