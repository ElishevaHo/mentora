import { Router } from 'express';
import { query } from '../db/pool.js';
import { ensure, text, toId } from '../lib/http.js';
import { toPerson, toTutorSummary } from '../lib/serialize.js';

export const tutorsRouter = Router();

const PAGE_SIZE = 12;

// Column names refer to the outer "cards" subquery in the list endpoint.
const SORTS = {
  rating: 'rating DESC, review_count DESC, id',
  reviews: 'review_count DESC, rating DESC, id',
  price_asc: 'hourly_rate ASC, rating DESC, id',
  price_desc: 'hourly_rate DESC, rating DESC, id',
  newest: 'created_at DESC, id',
};

// Shared SELECT for tutor cards: profile + rating aggregate + subject names.
export const TUTOR_CARD_SQL = `
  SELECT u.id, u.full_name, u.avatar_updated_at, u.created_at,
         tp.headline, tp.bio, tp.city, tp.hourly_rate, tp.teaches_online,
         tp.teaches_in_person, tp.years_experience, tp.is_published,
         COALESCE(r.avg_rating, 0)::float8 AS rating,
         COALESCE(r.review_count, 0)::int  AS review_count,
         COALESCE(s.names, '{}')           AS subjects
  FROM tutor_profiles tp
  JOIN users u ON u.id = tp.user_id
  LEFT JOIN LATERAL (
    SELECT AVG(rating) AS avg_rating, COUNT(*) AS review_count
    FROM reviews WHERE tutor_id = u.id
  ) r ON TRUE
  LEFT JOIN LATERAL (
    SELECT array_agg(sb.name ORDER BY sb.name) AS names
    FROM tutor_subjects ts JOIN subjects sb ON sb.id = ts.subject_id
    WHERE ts.tutor_id = u.id
  ) s ON TRUE`;

tutorsRouter.get('/', async (req, res) => {
  const where = ['tp.is_published', 'NOT u.is_blocked'];
  const params = [];
  const param = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (req.query.subject) {
    where.push(
      `EXISTS (SELECT 1 FROM tutor_subjects ts WHERE ts.tutor_id = u.id AND ts.subject_id = ${param(toId(req.query.subject))})`,
    );
  }
  const q = text(req.query.q, { max: 60 });
  if (q) {
    const pattern = param(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
    where.push(`(u.full_name ILIKE ${pattern} OR tp.headline ILIKE ${pattern} OR tp.city ILIKE ${pattern})`);
  }
  const maxPrice = Number(req.query.maxPrice);
  if (Number.isFinite(maxPrice) && maxPrice > 0) {
    where.push(`tp.hourly_rate <= ${param(maxPrice)}`);
  }
  if (req.query.mode === 'online') where.push('tp.teaches_online');
  if (req.query.mode === 'in_person') where.push('tp.teaches_in_person');

  const orderBy = SORTS[req.query.sort] ?? SORTS.rating;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

  const { rows } = await query(
    `SELECT *, COUNT(*) OVER()::int AS total FROM (${TUTOR_CARD_SQL}
       WHERE ${where.join(' AND ')}
     ) AS cards
     ORDER BY ${orderBy}
     LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    params,
  );

  res.json({
    items: rows.map(toTutorSummary),
    total: rows[0]?.total ?? 0,
    page,
    pageSize: PAGE_SIZE,
  });
});

tutorsRouter.get('/:id', async (req, res) => {
  const id = toId(req.params.id);

  const { rows } = await query(
    `${TUTOR_CARD_SQL} WHERE u.id = $1 AND tp.is_published AND NOT u.is_blocked`,
    [id],
  );
  ensure(rows[0], 'המורה לא נמצא/ה', 404);

  const [subjects, availability, reviews, stats] = await Promise.all([
    query(
      `SELECT sb.id, sb.name, sb.emoji FROM tutor_subjects ts
       JOIN subjects sb ON sb.id = ts.subject_id WHERE ts.tutor_id = $1 ORDER BY sb.name`,
      [id],
    ),
    query(
      `SELECT weekday, start_hour, end_hour FROM availability
       WHERE tutor_id = $1 ORDER BY weekday, start_hour`,
      [id],
    ),
    query(
      `SELECT r.id, r.rating, r.comment, r.created_at, s.id AS student_id,
              s.full_name AS student_name, s.avatar_updated_at AS student_avatar,
              sb.name AS subject_name
       FROM reviews r
       JOIN users s ON s.id = r.student_id
       JOIN lessons l ON l.id = r.lesson_id
       LEFT JOIN subjects sb ON sb.id = l.subject_id
       WHERE r.tutor_id = $1
       ORDER BY r.created_at DESC LIMIT 30`,
      [id],
    ),
    query(
      `SELECT COUNT(*) FILTER (WHERE status = 'confirmed' AND starts_at < now())::int AS lessons_taught,
              COUNT(DISTINCT student_id) FILTER (WHERE status = 'confirmed')::int AS students
       FROM lessons WHERE tutor_id = $1`,
      [id],
    ),
  ]);

  res.json({
    ...toTutorSummary(rows[0]),
    bio: rows[0].bio,
    subjects: subjects.rows,
    availability: availability.rows.map((a) => ({
      weekday: a.weekday,
      startHour: a.start_hour,
      endHour: a.end_hour,
    })),
    lessonsTaught: stats.rows[0].lessons_taught,
    students: stats.rows[0].students,
    reviews: reviews.rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
      subject: r.subject_name,
      student: toPerson(r.student_id, r.student_name, r.student_avatar),
    })),
  });
});

// Open one-hour slots for the next N days, computed in Israel local time.
tutorsRouter.get('/:id/slots', async (req, res) => {
  const id = toId(req.params.id);
  const days = Math.min(28, Math.max(1, Number.parseInt(req.query.days, 10) || 14));

  const { rows } = await query(
    `WITH days AS (
       SELECT (now() AT TIME ZONE 'Asia/Jerusalem')::date + i AS d
       FROM generate_series(0, $2 - 1) AS i
     ),
     slots AS (
       SELECT (d + make_time(h, 0, 0)) AT TIME ZONE 'Asia/Jerusalem' AS starts_at
       FROM days
       JOIN availability a ON a.tutor_id = $1 AND a.weekday = EXTRACT(DOW FROM d)
       CROSS JOIN LATERAL generate_series(a.start_hour::int, a.end_hour::int - 1) AS h
     )
     SELECT DISTINCT s.starts_at FROM slots s
     WHERE s.starts_at > now() + interval '2 hours'
       AND NOT EXISTS (
         SELECT 1 FROM lessons l
         WHERE l.tutor_id = $1 AND l.starts_at = s.starts_at
           AND l.status IN ('pending', 'confirmed')
       )
     ORDER BY s.starts_at`,
    [id, days],
  );

  res.json({ slots: rows.map((r) => r.starts_at) });
});
