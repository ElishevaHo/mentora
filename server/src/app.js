import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { HttpError } from './lib/http.js';
import { authRouter } from './api/auth.js';
import { usersRouter } from './api/users.js';
import { subjectsRouter } from './api/subjects.js';
import { tutorsRouter } from './api/tutors.js';
import { lessonsRouter } from './api/lessons.js';
import { studioRouter } from './api/studio.js';
import { messagesRouter } from './api/messages.js';
import { adminRouter } from './api/admin.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: { 'img-src': ["'self'", 'data:', 'blob:'] },
    },
  }));
  if (!config.isProd) app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/subjects', subjectsRouter);
  app.use('/api/tutors', tutorsRouter);
  app.use('/api/lessons', lessonsRouter);
  app.use('/api/studio', studioRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'הנתיב לא קיים')));

  // In production the API also serves the built React app.
  const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    app.get('/{*path}', (_req, res) => res.sendFile('index.html', { root: clientDist }));
  }

  app.use(errorHandler);
  return app;
}

function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'גוף הבקשה לא תקין' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'הקובץ גדול מדי (עד 2MB)' });
  }
  console.error(err);
  res.status(500).json({ error: 'שגיאת שרת. נסו שוב בעוד רגע' });
}
