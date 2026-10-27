import { createServer } from 'node:http';
import { config } from './config.js';
import { createApp } from './app.js';
import { attachSocket } from './socket.js';
import { migrate } from './db/migrate.js';
import { seedIfEmpty } from './db/seed.js';

await migrate();
if (config.autoSeed) await seedIfEmpty();

const httpServer = createServer(createApp());
attachSocket(httpServer);

httpServer.listen(config.port, () => {
  console.log(`Mentora API listening on http://localhost:${config.port}`);
});
