import mongoose from 'mongoose';

const icalSourceSchema = new mongoose.Schema(
  {
    platform: { type: String, required: true },
    url: { type: String, required: true },
    channel: { type: String },
    lastSynced: { type: Date },
    syncStatus: { type: String, enum: ['success', 'failed', 'never'], default: 'never' },
  },
  { _id: false }
);

const RoomSchema = new mongoose.Schema({
  // Existing kiosk fields
  room_no:    { type: String, required: true, unique: true },
  floor_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Floor' },
  directions: { type: String },

  // OTA / Channel Manager fields
  name:           { type: String },
  description:    { type: String },
  price_per_night: { type: Number },
  max_guests:     { type: Number, default: 2 },
  amenities:      [{ type: String }],
  room_status:    { type: String, enum: ['active', 'inactive'], default: 'active' },
  ical_sources:   [icalSourceSchema],
}, { timestamps: true });

export default mongoose.models.Room || mongoose.model('Room', RoomSchema);
