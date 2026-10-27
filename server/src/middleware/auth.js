import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db/pool.js';
import { HttpError } from '../lib/http.js';
import { USER_COLUMNS } from '../lib/serialize.js';

export function signToken(user) {
  return jwt.sign({ sub: String(user.id) }, config.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token) {
  return Number(jwt.verify(token, config.jwtSecret).sub);
}

// Loads the user from the DB on every request so blocks and role changes apply immediately.
export async function requireAuth(req, _res, next) {
  const header = req.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'יש להתחבר כדי להמשיך');

  let userId;
  try {
    userId = verifyToken(token);
  } catch {
    throw new HttpError(401, 'החיבור פג תוקף, התחברו מחדש');
  }

  const { rows } = await query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [userId]);
  const user = rows[0];
  if (!user || user.is_blocked) throw new HttpError(401, 'החשבון אינו פעיל');

  req.user = user;
  next();
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) throw new HttpError(403, 'אין לך הרשאה לפעולה הזו');
  next();
};
