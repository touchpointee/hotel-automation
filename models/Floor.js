import mongoose from 'mongoose';

const FloorSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },     // e.g. "1st Floor"
  directions: { type: String, required: true },             // e.g. "Take elevator to 1st floor"
}, { timestamps: true });

export default mongoose.models.Floor || mongoose.model('Floor', FloorSchema);
