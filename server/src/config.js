import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set — copy server/.env.example to server/.env');
}

export const config = {
  isProd,
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL,
  dbSsl: process.env.DB_SSL === 'true',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  autoSeed: process.env.AUTO_SEED === 'true',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || '',
  timeZone: 'Asia/Jerusalem',
};
