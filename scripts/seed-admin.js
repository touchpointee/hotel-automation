/**
 * Seed script: creates the initial admin user.
 * Run once: node scripts/seed-admin.js
 * 
 * Default credentials: admin / admin123
 * Change these before running in production!
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://root:scMBWWq4tEiKSwILzbcEAAX94E64Zy5AnbZTZyAycpCxv8lujMUTlvthakpMPtwV@72.61.238.188:5434/?directConnection=true';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin'], default: 'admin' },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const USERNAME = 'admin';
  const PASSWORD = 'admin123'; // Change this!

  const existing = await User.findOne({ username: USERNAME });
  if (existing) {
    console.log(`User "${USERNAME}" already exists. Skipping.`);
    process.exit(0);
  }

  const hashed = await bcrypt.hash(PASSWORD, 10);
  await User.create({ username: USERNAME, password: hashed, role: 'admin' });
  console.log(`✅ Admin user created: username="${USERNAME}", password="${PASSWORD}"`);
  console.log('⚠️  Remember to change the password after first login!');
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
