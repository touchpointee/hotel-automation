/**
 * Seed script: creates the initial admin user.
 *
 * Usage:
 *   npm run seed:admin
 *
 * Reads MONGODB_URI from .env.local (or .env), same as the app.
 * Optional: ADMIN_USERNAME, ADMIN_PASSWORD (default admin / admin123)
 */
const path = require('path');
const fs = require('fs');

function loadEnv() {
  const root = path.join(__dirname, '..');
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

loadEnv();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI. Add it to .env.local (or export it) and run again.');
  process.exit(1);
}

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin'], default: 'admin' },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const USERNAME = (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
  const PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await User.findOne({ username: USERNAME });
  if (existing) {
    console.log(`User "${USERNAME}" already exists. Nothing to do.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const hashed = await bcrypt.hash(PASSWORD, 10);
  await User.create({ username: USERNAME, password: hashed, role: 'admin' });
  console.log(`Admin user created: username="${USERNAME}"`);
  console.log('Change the password after first login if this was a default password.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
