import { readFile } from 'node:fs/promises';
import { query } from './pool.js';

const schemaUrl = new URL('./schema.sql', import.meta.url);

export async function migrate() {
  const sql = await readFile(schemaUrl, 'utf8');
  await query(sql);
}
