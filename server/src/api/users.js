import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { query } from '../db/pool.js';
import { HttpError, ensure, text, toId } from '../lib/http.js';
import { USER_COLUMNS, toUser } from '../lib/serialize.js';
import { requireAuth } from '../middleware/auth.js';

export const usersRouter = Router();

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Avatars live in Postgres so they survive redeploys on hosts with ephemeral disks.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new HttpError(400, 'אפשר להעלות רק תמונות (JPG, PNG, WEBP, GIF)'));
  },
});

usersRouter.put('/me', requireAuth, async (req, res) => {
  const fullName = text(req.body.fullName, { max: 60 });
  ensure(fullName.length >= 2, 'נא להזין שם מלא');

  const { rows } = await query(
    `UPDATE users SET full_name = $1 WHERE id = $2 RETURNING ${USER_COLUMNS}`,
    [fullName, req.user.id],
  );
  res.json({ user: toUser(rows[0]) });
});

usersRouter.put('/me/password', requireAuth, async (req, res) => {
  const current = String(req.body.currentPassword ?? '');
  const next = String(req.body.newPassword ?? '');
  ensure(next.length >= 8, 'הסיסמה החדשה צריכה להכיל לפחות 8 תווים');

  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  ensure(await bcrypt.compare(current, rows[0].password_hash), 'הסיסמה הנוכחית שגויה');

  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [
    await bcrypt.hash(next, 10),
    req.user.id,
  ]);
  res.status(204).end();
});

usersRouter.put('/me/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  ensure(req.file, 'לא נבחרה תמונה');
  const { rows } = await query(
    `UPDATE users SET avatar = $1, avatar_mime = $2, avatar_updated_at = now()
     WHERE id = $3 RETURNING ${USER_COLUMNS}`,
    [req.file.buffer, req.file.mimetype, req.user.id],
  );
  res.json({ user: toUser(rows[0]) });
});

usersRouter.delete('/me/avatar', requireAuth, async (req, res) => {
  const { rows } = await query(
    `UPDATE users SET avatar = NULL, avatar_mime = NULL, avatar_updated_at = NULL
     WHERE id = $1 RETURNING ${USER_COLUMNS}`,
    [req.user.id],
  );
  res.json({ user: toUser(rows[0]) });
});

usersRouter.get('/:id/avatar', async (req, res) => {
  const { rows } = await query('SELECT avatar, avatar_mime FROM users WHERE id = $1', [
    toId(req.params.id),
  ]);
  ensure(rows[0]?.avatar, 'אין תמונה', 404);

  // The URL carries a version query param, so the image can be cached forever.
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.type(rows[0].avatar_mime).send(rows[0].avatar);
});
