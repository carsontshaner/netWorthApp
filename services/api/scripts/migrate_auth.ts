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
      CREATE TABLE IF NOT EXISTS positions (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category    TEXT NOT NULL,
        side        TEXT NOT NULL CHECK (side IN ('asset', 'liability')),
        label       TEXT,
        source_type TEXT NOT NULL DEFAULT 'manual',
        archived    BOOLEAN NOT NULL DEFAULT false,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    console.log('  ✓ positions table');

    await client.query(`
      CREATE TABLE IF NOT EXISTS valuation_snapshots (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        as_of_date  DATE NOT NULL,
        value       NUMERIC(20, 2) NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    console.log('  ✓ valuation_snapshots table');

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'unique_position_date'
          AND conrelid = 'valuation_snapshots'::regclass
        ) THEN
          ALTER TABLE valuation_snapshots
            ADD CONSTRAINT unique_position_date UNIQUE (position_id, as_of_date);
        END IF;
      END $$
    `);
    console.log('  ✓ unique_position_date constraint');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id)
    `);
    console.log('  ✓ idx_positions_user_id index');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_snapshots_position_id ON valuation_snapshots(position_id)
    `);
    console.log('  ✓ idx_snapshots_position_id index');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_snapshots_user_date ON valuation_snapshots(user_id, as_of_date)
    `);
    console.log('  ✓ idx_snapshots_user_date index');

    await client.query(`
      ALTER TABLE positions
        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)
    `);
    console.log('  ✓ positions.user_id column (idempotent)');

    await client.query(`
      ALTER TABLE valuation_snapshots
        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)
    `);
    console.log('  ✓ valuation_snapshots.user_id column (idempotent)');

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
