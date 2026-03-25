import mongoose from 'mongoose';

const CheckinLockSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // e.g. "global"
    lockedUntil: { type: Date, default: null },
    lockedByOtp: { type: String, default: null },
  },
  { collection: 'checkinlocks', timestamps: true }
);

export default mongoose.models.CheckinLock || mongoose.model('CheckinLock', CheckinLockSchema);

