import { Router } from 'express';
import { query } from '../db/pool.js';
import { HttpError, ensure, text, toId } from '../lib/http.js';
import { toLesson } from '../lib/serialize.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { notify } from '../socket.js';

export const lessonsRouter = Router();
lessonsRouter.use(requireAuth);

const LESSON_SQL = `
  SELECT l.*, (l.starts_at < now()) AS is_past,
         sb.name AS subject_name, sb.emoji AS subject_emoji,
         t.full_name AS tutor_name, t.avatar_updated_at AS tutor_avatar,
         st.full_name AS student_name, st.avatar_updated_at AS student_avatar,
         r.rating AS review_rating, r.comment AS review_comment
  FROM lessons l
  JOIN users t ON t.id = l.tutor_id
  JOIN users st ON st.id = l.student_id
  LEFT JOIN subjects sb ON sb.id = l.subject_id
  LEFT JOIN reviews r ON r.lesson_id = l.id`;

async function findLesson(id) {
  const { rows } = await query(`${LESSON_SQL} WHERE l.id = $1`, [id]);
  return rows[0];
}

lessonsRouter.get('/', async (req, res) => {
  const { rows } = await query(
    `${LESSON_SQL} WHERE l.tutor_id = $1 OR l.student_id = $1 ORDER BY l.starts_at`,
    [req.user.id],
  );
  res.json({ lessons: rows.map(toLesson) });
});

lessonsRouter.post('/', requireRole('student'), async (req, res) => {
  const tutorId = toId(req.body.tutorId);
  const subjectId = toId(req.body.subjectId);
  const mode = req.body.mode === 'in_person' ? 'in_person' : 'online';
  const note = text(req.body.note, { max: 500 });
  const startsAt = new Date(req.body.startsAt);
  ensure(!Number.isNaN(startsAt.getTime()), 'מועד השיעור לא תקין');

  const { rows: tutorRows } = await query(
    `SELECT tp.hourly_rate, tp.teaches_online, tp.teaches_in_person,
            EXISTS (SELECT 1 FROM tutor_subjects WHERE tutor_id = tp.user_id AND subject_id = $2) AS teaches_subject
     FROM tutor_profiles tp JOIN users u ON u.id = tp.user_id
     WHERE tp.user_id = $1 AND tp.is_published AND NOT u.is_blocked`,
    [tutorId, subjectId],
  );
  const tutor = tutorRows[0];
  ensure(tutor, 'המורה לא נמצא/ה', 404);
  ensure(tutor.teaches_subject, 'המורה לא מלמד/ת את המקצוע הזה');
  ensure(mode === 'online' ? tutor.teaches_online : tutor.teaches_in_person, 'סוג השיעור לא זמין אצל המורה');

  // The requested hour must fall inside the tutor's weekly availability (Israel time).
  const { rows: fits } = await query(
    `WITH t AS (SELECT $2::timestamptz AT TIME ZONE 'Asia/Jerusalem' AS local)
     SELECT 1 FROM availability a, t
     WHERE a.tutor_id = $1
       AND $2::timestamptz > now() + interval '2 hours'
       AND a.weekday = EXTRACT(DOW FROM t.local)
       AND EXTRACT(HOUR FROM t.local) >= a.start_hour
       AND EXTRACT(HOUR FROM t.local) < a.end_hour
       AND EXTRACT(MINUTE FROM t.local) = 0
     LIMIT 1`,
    [tutorId, startsAt.toISOString()],
  );
  ensure(fits.length, 'השעה הזו לא פנויה אצל המורה');

  let id;
  try {
    const { rows } = await query(
      `INSERT INTO lessons (tutor_id, student_id, subject_id, starts_at, mode, note, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [tutorId, req.user.id, subjectId, startsAt.toISOString(), mode, note, tutor.hourly_rate],
    );
    id = rows[0].id;
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'מישהו אחר הזמין את השעה הזו הרגע. בחרו שעה אחרת');
    throw err;
  }

  const lesson = toLesson(await findLesson(id));
  notify(tutorId, 'lesson:changed', lesson);
  res.status(201).json({ lesson });
});

const TRANSITIONS = {
  confirm: { to: 'confirmed', from: ['pending'], tutorOnly: true },
  decline: { to: 'declined', from: ['pending'], tutorOnly: true },
  cancel: { to: 'cancelled', from: ['pending', 'confirmed'], tutorOnly: false },
};

lessonsRouter.patch('/:id', async (req, res) => {
  const row = await findLesson(toId(req.params.id));
  const transition = TRANSITIONS[req.body.action];
  ensure(transition, 'פעולה לא מוכרת');

  const isTutor = row?.tutor_id === req.user.id;
  const isStudent = row?.student_id === req.user.id;
  ensure(isTutor || isStudent, 'השיעור לא נמצא', 404);
  ensure(isTutor || !transition.tutorOnly, 'רק המורה יכול/ה לבצע את הפעולה הזו', 403);
  ensure(transition.from.includes(row.status), 'אי אפשר לשנות את הסטטוס של השיעור הזה');
  ensure(!row.is_past, 'השיעור כבר התקיים');

  await query('UPDATE lessons SET status = $1 WHERE id = $2', [transition.to, row.id]);

  const lesson = toLesson(await findLesson(row.id));
  notify(isTutor ? row.student_id : row.tutor_id, 'lesson:changed', lesson);
  res.json({ lesson });
});

lessonsRouter.post('/:id/review', async (req, res) => {
  const row = await findLesson(toId(req.params.id));
  const rating = Number(req.body.rating);
  const comment = text(req.body.comment, { max: 1000 });

  ensure(row?.student_id === req.user.id, 'השיעור לא נמצא', 404);
  ensure(row.status === 'confirmed' && row.is_past, 'אפשר לדרג רק שיעור שהתקיים');
  ensure(Number.isInteger(rating) && rating >= 1 && rating <= 5, 'הדירוג צריך להיות בין 1 ל-5');

  try {
    await query(
      `INSERT INTO reviews (lesson_id, tutor_id, student_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)`,
      [row.id, row.tutor_id, row.student_id, rating, comment],
    );
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'כבר דירגת את השיעור הזה');
    throw err;
  }

  res.status(201).json({ lesson: toLesson(await findLesson(row.id)) });
});
