import { pool } from '../src/db.js';

const USER_ID = 'user_1';

const POSITIONS = [
  // Assets
  { name: 'Chase Checking',           side: 'asset',     category: 'cash',               baseValue: 12_500 },
  { name: 'Fidelity Brokerage',       side: 'asset',     category: 'brokerage',          baseValue: 87_000 },
  { name: '401k — Vanguard',          side: 'asset',     category: 'retirement',         baseValue: 210_000 },
  { name: 'Primary Residence',        side: 'asset',     category: 'real_estate',        baseValue: 620_000 },
  { name: 'Toyota Camry',             side: 'asset',     category: 'vehicle',            baseValue: 18_000 },
  { name: 'Acme Co. Shares',          side: 'asset',     category: 'business_ownership', baseValue: 45_000 },
  // Liabilities
  { name: 'Primary Mortgage',         side: 'liability', category: 'mortgage',           baseValue: 410_000 },
  { name: 'Visa Signature',           side: 'liability', category: 'credit_card',        baseValue: 4_200 },
  { name: 'Federal Student Loan',     side: 'liability', category: 'student_loan',       baseValue: 28_000 },
  { name: 'Toyota Auto Loan',         side: 'liability', category: 'auto_loan',          baseValue: 11_500 },
  { name: 'Personal Line of Credit',  side: 'liability', category: 'personal_loan',      baseValue: 6_000 },
  { name: 'State Tax Estimate',       side: 'liability', category: 'taxes_owed',         baseValue: 3_800 },
] as const;

function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clean existing data — snapshots first (FK dependency)
    await client.query('DELETE FROM valuation_snapshots WHERE user_id = $1', [USER_ID]);
    await client.query('DELETE FROM positions WHERE user_id = $1', [USER_ID]);

    // Build date array: 60 days ending today, oldest first
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates: string[] = [];
    for (let i = 59; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(formatDate(d));
    }

    for (const pos of POSITIONS) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO positions (user_id, name, side, category, currency_code)
         VALUES ($1, $2, $3, $4, 'USD')
         RETURNING id`,
        [USER_ID, pos.name, pos.side, pos.category],
      );
      const positionId = rows[0].id;

      // Random walk starting from baseValue, ±0.5% per day
      let value = pos.baseValue;
      for (const date of dates) {
        value = value * (1 + (Math.random() * 0.01 - 0.005));
        await client.query(
          `INSERT INTO valuation_snapshots
             (user_id, position_id, as_of_date, value, source_type, source_details)
           VALUES ($1, $2, $3, $4, 'manual', 'seed data')
           ON CONFLICT (position_id, as_of_date) DO UPDATE SET value = EXCLUDED.value`,
          [USER_ID, positionId, date, Math.round(value * 100) / 100],
        );
      }

      console.log(`  ✓ ${pos.name} (${dates.length} snapshots)`);
    }

    await client.query('COMMIT');
    console.log('\nSeed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed, rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
