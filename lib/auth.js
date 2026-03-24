import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const SECRET = '195434f72a018a5771cd59145e75d8417221ffa5414a161fd0d4f22e36481b7b77f7b5116156eae06b5c9ab66fce7a818bf24484ecf222329c08998c31ef7d26';
console.log(`[AUTH-LIB] HARDCODED Secret first 4 chars: ${SECRET.substring(0, 4)}...`);
const SECRET_KEY = new TextEncoder().encode(SECRET);

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}
