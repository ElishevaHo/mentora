// The tutor's own workspace: profile editing, weekly schedule and stats.
import { Router } from 'express';
import { query, withTransaction } from '../db/pool.js';
import { ensure, text } from '../lib/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const studioRouter = Router();
studioRouter.use(requireAuth, requireRole('tutor'));

async function loadStudio(userId) {
  const [profile, subjects, availability] = await Promise.all([
    query('SELECT * FROM tutor_profiles WHERE user_id = $1', [userId]),
    query('SELECT subject_id FROM tutor_subjects WHERE tutor_id = $1', [userId]),
    query(
      'SELECT weekday, start_hour, end_hour FROM availability WHERE tutor_id = $1 ORDER BY weekday, start_hour',
      [userId],
    ),
  ]);
  const p = profile.rows[0];
  return {
    headline: p.headline,
    bio: p.bio,
    city: p.city,
    hourlyRate: p.hourly_rate,
    teachesOnline: p.teaches_online,
    teachesInPerson: p.teaches_in_person,
    yearsExperience: p.years_experience,
    isPublished: p.is_published,
    subjectIds: subjects.rows.map((r) => r.subject_id),
    availability: availability.rows.map((a) => ({
      weekday: a.weekday,
      startHour: a.start_hour,
      endHour: a.end_hour,
    })),
  };
}

studioRouter.get('/', async (req, res) => {
  res.json(await loadStudio(req.user.id));
});

studioRouter.put('/', async (req, res) => {
  const body = req.body;
  const profile = {
    headline: text(body.headline, { max: 90 }),
    bio: text(body.bio, { max: 2000 }),
    city: text(body.city, { max: 40 }),
    hourlyRate: Number(body.hourlyRate),
    teachesOnline: Boolean(body.teachesOnline),
    teachesInPerson: Boolean(body.teachesInPerson),
    yearsExperience: Number(body.yearsExperience) || 0,
    isPublished: Boolean(body.isPublished),
  };
  const subjectIds = [...new Set((body.subjectIds ?? []).map(Number))].filter(Number.isInteger);
  const availability = Array.isArray(body.availability) ? body.availability : [];

  ensure(Number.isInteger(profile.hourlyRate) && profile.hourlyRate >= 30 && profile.hourlyRate <= 1000,
    'מחיר לשעה צריך להיות בין 30 ל-1000 ₪');
  ensure(profile.yearsExperience >= 0 && profile.yearsExperience <= 60, 'שנות ניסיון לא תקינות');
  ensure(subjectIds.length <= 8, 'אפשר לבחור עד 8 מקצועות');
  ensure(availability.length <= 50, 'יותר מדי טווחי זמינות');
  for (const a of availability) {
    ensure(
      Number.isInteger(a.weekday) && a.weekday >= 0 && a.weekday <= 6 &&
      Number.isInteger(a.startHour) && Number.isInteger(a.endHour) &&
      a.startHour >= 0 && a.endHour <= 24 && a.endHour > a.startHour,
      'טווח זמינות לא תקין',
    );
  }
  if (profile.isPublished) {
    ensure(profile.headline.length >= 5, 'כדי לפרסם את הפרופיל צריך כותרת קצרה');
    ensure(subjectIds.length > 0, 'כדי לפרסם את הפרופיל צריך לבחור לפחות מקצוע אחד');
    ensure(availability.length > 0, 'כדי לפרסם את הפרופיל צריך לסמן שעות פנויות');
    ensure(profile.teachesOnline || profile.teachesInPerson, 'צריך לבחור אונליין, פרונטלי או את שניהם');
  }

  await withTransaction(async (db) => {
    await db.query(
      `UPDATE tutor_profiles SET headline = $2, bio = $3, city = $4, hourly_rate = $5,
         teaches_online = $6, teaches_in_person = $7, years_experience = $8, is_published = $9
       WHERE user_id = $1`,
      [req.user.id, profile.headline, profile.bio, profile.city, profile.hourlyRate,
        profile.teachesOnline, profile.teachesInPerson, profile.yearsExperience, profile.isPublished],
    );

    await db.query('DELETE FROM tutor_subjects WHERE tutor_id = $1', [req.user.id]);
    await db.query(
      `INSERT INTO tutor_subjects (tutor_id, subject_id)
       SELECT $1, id FROM subjects WHERE id = ANY($2::int[])`,
      [req.user.id, subjectIds],
    );

    await db.query('DELETE FROM availability WHERE tutor_id = $1', [req.user.id]);
    for (const a of availability) {
      await db.query(
        'INSERT INTO availability (tutor_id, weekday, start_hour, end_hour) VALUES ($1, $2, $3, $4)',
        [req.user.id, a.weekday, a.startHour, a.endHour],
      );
    }
  });

  res.json(await loadStudio(req.user.id));
});

studioRouter.get('/stats', async (req, res) => {
  const { rows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'confirmed' AND starts_at > now())::int AS upcoming,
       COUNT(*) FILTER (WHERE status = 'pending' AND starts_at > now())::int AS pending,
       COUNT(DISTINCT student_id) FILTER (WHERE status = 'confirmed')::int AS students,
       COALESCE(SUM(price) FILTER (
         WHERE status = 'confirmed' AND starts_at <= now()
           AND date_trunc('month', starts_at AT TIME ZONE 'Asia/Jerusalem')
             = date_trunc('month', now() AT TIME ZONE 'Asia/Jerusalem')
       ), 0)::int AS earned_this_month,
       (SELECT COALESCE(AVG(rating), 0)::float8 FROM reviews WHERE tutor_id = $1) AS rating,
       (SELECT COUNT(*)::int FROM reviews WHERE tutor_id = $1) AS review_count
     FROM lessons WHERE tutor_id = $1`,
    [req.user.id],
  );
  const s = rows[0];
  res.json({
    upcoming: s.upcoming,
    pending: s.pending,
    students: s.students,
    earnedThisMonth: s.earned_this_month,
    rating: Math.round(s.rating * 10) / 10,
    reviewCount: s.review_count,
  });
});
