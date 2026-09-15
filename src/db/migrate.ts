import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

import { pool } from './pool';

async function runMigrations() {
  const migrationsDir = process.env.MIGRATIONS_DIR
    ? path.resolve(process.env.MIGRATIONS_DIR)
    : path.join(process.cwd(), 'src', 'db', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Running migration: ${file}`);
    await pool.query(sql);
    console.log(`Completed migration: ${file}`);
  }

  console.log('All migrations completed successfully.');
  await pool.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
