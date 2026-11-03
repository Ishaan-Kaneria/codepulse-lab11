// server/db.js
// One shared connection pool for the whole app (node-postgres).
// Settings come from .env (local) or from Netlify environment variables (deployed).
require('dotenv').config();
const { Pool, types } = require('pg');

// Return DATE / TIMESTAMP as plain text so no timezone shift happens between server and browser,
// and turn BIGINT / NUMERIC into JavaScript numbers (all values in this project fit safely).
types.setTypeParser(1082, (v) => v);              // date
types.setTypeParser(1114, (v) => v);              // timestamp without time zone
types.setTypeParser(20, (v) => Number(v));        // bigint (COUNT, BIGSERIAL ids)
types.setTypeParser(1700, (v) => Number(v));      // numeric

// DATABASE_URL (any hosted Postgres) wins; on Netlify, Netlify Database injects NETLIFY_DB_URL.
const dbUrl = process.env.DATABASE_URL || process.env.NETLIFY_DB_URL;
const useUrl = Boolean(dbUrl);
// Hosted databases need SSL; a local URL (localhost / sslmode=disable) does not.
const urlNeedsSsl = useUrl && !/localhost|127\.0\.0\.1|sslmode=disable/.test(dbUrl);

const pool = new Pool(
  useUrl
    ? {
        connectionString: dbUrl,
        ssl: urlNeedsSsl ? { rejectUnauthorized: false } : false,
        max: 3                                // small pool: serverless functions are short-lived
      }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE || 'leetcode_lab',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD,
        max: 10
      }
);

pool.on('error', (err) => console.error('Unexpected PostgreSQL error:', err.message));

// Helper: run one parameterised statement ($1, $2, ...) and return the full result.
async function run(sql, params = []) {
  return pool.query(sql, params);
}

// Helper: run several statements inside one transaction (BEGIN ... COMMIT / ROLLBACK).
async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, run, withTransaction };
