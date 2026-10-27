import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { query, withTransaction } from '../db/pool.js';
import { EMAIL_RE, ensure, text } from '../lib/http.js';
import { USER_COLUMNS, toUser } from '../lib/serialize.js';
import { requireAuth, signToken } from '../middleware/auth.js';

export const authRouter = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'יותר מדי ניסיונות, נסו שוב בעוד כמה דקות' },
});

authRouter.post('/register', limiter, async (req, res) => {
  const fullName = text(req.body.fullName, { max: 60 });
  const email = text(req.body.email, { max: 120 }).toLowerCase();
  const password = String(req.body.password ?? '');
  const role = req.body.role === 'tutor' ? 'tutor' : 'student';

  ensure(fullName.length >= 2, 'נא להזין שם מלא');
  ensure(EMAIL_RE.test(email), 'כתובת האימייל לא תקינה');
  ensure(password.length >= 8, 'הסיסמה צריכה להכיל לפחות 8 תווים');

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await withTransaction(async (db) => {
    const { rows } = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING ${USER_COLUMNS}`,
      [fullName, email, passwordHash, role],
    );
    ensure(rows[0], 'כבר קיים חשבון עם האימייל הזה', 409);
    if (role === 'tutor') {
      await db.query('INSERT INTO tutor_profiles (user_id) VALUES ($1)', [rows[0].id]);
    }
    return rows[0];
  });

  res.status(201).json({ token: signToken(user), user: toUser(user) });
});

authRouter.post('/login', limiter, async (req, res) => {
  const email = text(req.body.email, { max: 120 }).toLowerCase();
  const password = String(req.body.password ?? '');

  const { rows } = await query(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = $1`,
    [email],
  );
  const user = rows[0];
  const valid = user && (await bcrypt.compare(password, user.password_hash));
  ensure(valid, 'אימייל או סיסמה שגויים', 401);
  ensure(!user.is_blocked, 'החשבון הושעה. לפרטים פנו למנהל המערכת', 403);

  res.json({ token: signToken(user), user: toUser(user) });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: toUser(req.user) });
});
