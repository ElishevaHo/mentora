import { Router } from 'express';
import { query } from '../db/pool.js';
import { HttpError, ensure, text, toId } from '../lib/http.js';
import { USER_COLUMNS, toUser } from '../lib/serialize.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get('/overview', async (_req, res) => {
  const { rows } = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM users WHERE role = 'student') AS students,
      (SELECT COUNT(*)::int FROM users WHERE role = 'tutor') AS tutors,
      (SELECT COUNT(*)::int FROM tutor_profiles WHERE is_published) AS published_tutors,
      (SELECT COUNT(*)::int FROM lessons) AS lessons,
      (SELECT COUNT(*)::int FROM lessons WHERE created_at > now() - interval '7 days') AS lessons_this_week,
      (SELECT COUNT(*)::int FROM messages) AS messages,
      (SELECT COALESCE(AVG(rating), 0)::float8 FROM reviews) AS avg_rating`);
  const o = rows[0];
  res.json({
    students: o.students,
    tutors: o.tutors,
    publishedTutors: o.published_tutors,
    lessons: o.lessons,
    lessonsThisWeek: o.lessons_this_week,
    messages: o.messages,
    avgRating: Math.round(o.avg_rating * 10) / 10,
  });
});

adminRouter.get('/users', async (req, res) => {
  const q = text(req.query.q, { max: 60 });
  const { rows } = await query(
    `SELECT ${USER_COLUMNS} FROM users
     WHERE $1 = '' OR full_name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%'
     ORDER BY created_at DESC LIMIT 200`,
    [q.replace(/[\\%_]/g, '\\$&')],
  );
  res.json({ users: rows.map(toUser) });
});

adminRouter.patch('/users/:id', async (req, res) => {
  const id = toId(req.params.id);
  ensure(id !== req.user.id, 'אי אפשר לשנות את החשבון של עצמך מכאן');

  const updates = [];
  const params = [id];
  if (typeof req.body.isBlocked === 'boolean') {
    params.push(req.body.isBlocked);
    updates.push(`is_blocked = $${params.length}`);
  }
  if (['student', 'tutor', 'admin'].includes(req.body.role)) {
    params.push(req.body.role);
    updates.push(`role = $${params.length}`);
  }
  ensure(updates.length, 'אין מה לעדכן');

  const { rows } = await query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $1 RETURNING ${USER_COLUMNS}`,
    params,
  );
  ensure(rows[0], 'המשתמש לא נמצא', 404);
  if (rows[0].role === 'tutor') {
    await query('INSERT INTO tutor_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [id]);
  }
  res.json({ user: toUser(rows[0]) });
});

adminRouter.delete('/users/:id', async (req, res) => {
  const id = toId(req.params.id);
  ensure(id !== req.user.id, 'אי אפשר למחוק את החשבון של עצמך');
  const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
  ensure(rowCount, 'המשתמש לא נמצא', 404);
  res.status(204).end();
});

adminRouter.post('/subjects', async (req, res) => {
  const name = text(req.body.name, { max: 40 });
  const emoji = text(req.body.emoji, { max: 8 }) || '📘';
  ensure(name.length >= 2, 'נא להזין שם מקצוע');
  try {
    const { rows } = await query(
      'INSERT INTO subjects (name, emoji) VALUES ($1, $2) RETURNING id, name, emoji',
      [name, emoji],
    );
    res.status(201).json({ subject: { ...rows[0], tutorCount: 0 } });
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'המקצוע כבר קיים');
    throw err;
  }
});

adminRouter.delete('/subjects/:id', async (req, res) => {
  const { rowCount } = await query('DELETE FROM subjects WHERE id = $1', [toId(req.params.id)]);
  ensure(rowCount, 'המקצוע לא נמצא', 404);
  res.status(204).end();
});
