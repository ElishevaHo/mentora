import { Router } from 'express';
import { query } from '../db/pool.js';

export const subjectsRouter = Router();

subjectsRouter.get('/', async (_req, res) => {
  const { rows } = await query(
    `SELECT s.id, s.name, s.emoji, COUNT(tp.user_id)::int AS tutor_count
     FROM subjects s
     LEFT JOIN tutor_subjects ts ON ts.subject_id = s.id
     LEFT JOIN tutor_profiles tp ON tp.user_id = ts.tutor_id AND tp.is_published
     GROUP BY s.id ORDER BY tutor_count DESC, s.name`,
  );
  res.json({
    subjects: rows.map((r) => ({ id: r.id, name: r.name, emoji: r.emoji, tutorCount: r.tutor_count })),
  });
});
