import { pool } from '../src/db.js';

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email       TEXT UNIQUE NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    console.log('  ✓ users table');

    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email       TEXT NOT NULL,
        code        TEXT NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        used        BOOLEAN NOT NULL DEFAULT false,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    console.log('  ✓ otp_codes table');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email)
    `);
    console.log('  ✓ idx_otp_email index');

    await client.query(`
      ALTER TABLE positions
        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)
    `);
    console.log('  ✓ positions.user_id column');

    await client.query(`
      ALTER TABLE valuation_snapshots
        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)
    `);
    console.log('  ✓ valuation_snapshots.user_id column');

    await client.query('COMMIT');
    console.log('\nMigration complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
