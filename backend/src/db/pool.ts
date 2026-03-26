import { Pool } from 'pg';

const pool = new Pool({
  host:     process.env.PGHOST     ?? 'localhost',
  port:     Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? 'reader_v',
  user:     process.env.PGUSER     ?? 'postgres',
  password: process.env.PGPASSWORD ?? '',
});

pool.on('error', (err) => {
  console.error('Postgres pool error:', err);
});

export default pool;
