import fs from 'fs';
import path from 'path';
import pool from './pool';

async function init() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Database schema applied.');
  await pool.end();
}

init().catch((err) => { console.error(err); process.exit(1); });
