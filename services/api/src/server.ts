import dotenv from 'dotenv';
dotenv.config();

import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import { AssetCategory, BalanceSheetSide, LiabilityCategory, PositionCategory, PositionSourceType } from '@finance-clarity/shared';
import { authRouter, JWT_SECRET } from './auth.js';

type AuthedRequest = Request & { userId?: string };

const app = express();
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8081',
    'https://finance-clarityapi-production.up.railway.app',
  ],
  credentials: true,
}));
app.use(express.json());

const authMiddleware = (req: AuthedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.header('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & { userId: string };
      req.userId = decoded.userId;
      next();
      return;
    } catch {
      // invalid token — fall through to legacy header
    }
  }

  // No valid auth — proceed without userId
  next();
};

// Run lightweight DDL migrations on startup
pool.query(`
  ALTER TABLE positions ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false
`).catch(err => console.error('DDL migration failed:', err));

pool.query(`
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'uq_snapshot_position_date'
      AND conrelid = 'valuation_snapshots'::regclass
    ) THEN
      ALTER TABLE valuation_snapshots
        ADD CONSTRAINT uq_snapshot_position_date UNIQUE (position_id, as_of_date);
    END IF;
  END $$;
`).catch(err => console.error('DDL migration (unique constraint) failed:', err));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Auth routes are public — mount before authMiddleware
app.use('/auth', authRouter);

app.use(authMiddleware);

const allowedCategories = new Set<string>([
  ...Object.values(AssetCategory),
  ...Object.values(LiabilityCategory)
]);

const allowedSides = new Set<BalanceSheetSide>(['asset', 'liability']);
const allowedSourceTypes = new Set<string>(Object.values(PositionSourceType));

app.post('/positions', async (req: AuthedRequest, res: Response) => {
  const { name, side, category, currencyCode = 'USD', linkedAccountId = null, notes = null } = req.body;

  if (!req.userId || !name || !allowedSides.has(side) || !allowedCategories.has(category)) {
    res.status(400).json({ error: 'Invalid position payload' });
    return;
  }

  const query = `
    INSERT INTO positions (user_id, name, side, category, currency_code, linked_account_id, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const { rows } = await pool.query(query, [
    req.userId,
    name,
    side,
    category,
    currencyCode,
    linkedAccountId,
    notes
  ]);

  res.status(201).json(rows[0]);
});

app.get('/positions', async (req: AuthedRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { rows } = await pool.query(
    `SELECT * FROM positions WHERE user_id = $1 AND (archived = false OR archived IS NULL) ORDER BY created_at DESC`,
    [req.userId]
  );

  res.json(rows);
});

app.patch('/positions/:id', async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;

  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { value, archived, label, name, category, currencyCode, linkedAccountId, notes } = req.body;

  if (category && !allowedCategories.has(category)) {
    res.status(400).json({ error: 'Invalid category' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (value !== undefined) {
      await client.query(
        `INSERT INTO valuation_snapshots (position_id, user_id, as_of_date, value, source_type, source_details)
         VALUES ($1, $2, CURRENT_DATE, $3, 'manual', '{}')
         ON CONFLICT (position_id, as_of_date)
         DO UPDATE SET value = EXCLUDED.value`,
        [id, req.userId, value]
      );
    }

    if (archived !== undefined) {
      await client.query(
        `UPDATE positions SET archived = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
        [archived, id, req.userId]
      );
    }

    const positionName = name ?? label ?? null;
    if (positionName !== null || category !== undefined || currencyCode !== undefined || linkedAccountId !== undefined || notes !== undefined) {
      await client.query(
        `UPDATE positions
           SET name = COALESCE($3, name),
               category = COALESCE($4, category),
               currency_code = COALESCE($5, currency_code),
               linked_account_id = COALESCE($6, linked_account_id),
               notes = COALESCE($7, notes),
               updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [id, req.userId, positionName, category ?? null, currencyCode ?? null, linkedAccountId ?? null, notes ?? null]
      );
    }

    await client.query('COMMIT');

    const { rows } = await client.query(`SELECT * FROM positions WHERE id = $1 AND user_id = $2`, [id, req.userId]);
    if (!rows[0]) {
      res.status(404).json({ error: 'Position not found' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

app.delete('/positions/:id', async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;

  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM valuation_snapshots WHERE position_id = $1`, [id]);
    const { rowCount } = await client.query(`DELETE FROM positions WHERE id = $1 AND user_id = $2`, [id, req.userId]);
    await client.query('COMMIT');

    if (!rowCount) {
      res.status(404).json({ error: 'Position not found' });
      return;
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

app.post('/snapshots', async (req: AuthedRequest, res: Response) => {
  const { positionId, asOfDate, value, sourceType, sourceDetails } = req.body;

  if (!positionId || !asOfDate || typeof value !== 'number' || value < 0 || !allowedSourceTypes.has(sourceType) || !sourceDetails) {
    res.status(400).json({ error: 'Invalid snapshot payload' });
    return;
  }

  const query = `
    INSERT INTO valuation_snapshots (user_id, position_id, as_of_date, value, source_type, source_details)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (position_id, as_of_date)
    DO UPDATE SET
      value = EXCLUDED.value,
      source_type = EXCLUDED.source_type,
      source_details = EXCLUDED.source_details,
      created_at = NOW()
    RETURNING *
  `;

  const { rows } = await pool.query(query, [
    req.userId,
    positionId,
    asOfDate,
    value,
    sourceType,
    sourceDetails
  ]);

  res.status(201).json(rows[0]);
});

app.get('/chart/networth', async (req: AuthedRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const query = `
    WITH date_series AS (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE,
        interval '1 day'
      )::date AS as_of_date
    ),
    daily_totals AS (
      SELECT
        (vs.as_of_date::date) AS as_of_date,
        SUM(CASE WHEN p.side = 'asset' THEN vs.value ELSE 0 END) AS total_assets,
        SUM(CASE WHEN p.side = 'liability' THEN vs.value ELSE 0 END) AS total_liabilities
      FROM valuation_snapshots vs
      INNER JOIN positions p ON p.id = vs.position_id
      WHERE vs.user_id = $1
        AND (vs.as_of_date::date) <= CURRENT_DATE
      GROUP BY (vs.as_of_date::date)
    ),
    first_known AS (
      SELECT MIN(as_of_date) AS first_date FROM daily_totals
    ),
    chart_series AS (
      SELECT
        ds.as_of_date,
        fk.first_date,
        CASE
          WHEN fk.first_date IS NULL OR ds.as_of_date < fk.first_date THEN 0
          ELSE COALESCE(latest.total_assets, 0)
        END AS total_assets,
        CASE
          WHEN fk.first_date IS NULL OR ds.as_of_date < fk.first_date THEN 0
          ELSE COALESCE(latest.total_liabilities, 0)
        END AS total_liabilities
      FROM date_series ds
      CROSS JOIN first_known fk
      LEFT JOIN LATERAL (
        SELECT dt.total_assets, dt.total_liabilities
        FROM daily_totals dt
        WHERE dt.as_of_date <= ds.as_of_date
        ORDER BY dt.as_of_date DESC
        LIMIT 1
      ) latest ON true
    )
    SELECT
      cs.as_of_date,
      cs.total_assets,
      cs.total_liabilities,
      cs.total_assets - cs.total_liabilities AS net_worth,
      cs.first_date
    FROM chart_series cs
    ORDER BY cs.as_of_date ASC
  `;

  const { rows } = await pool.query(query, [req.userId]);

  const dataStartDate = rows[0]?.first_date
    ? (rows[0].first_date instanceof Date ? rows[0].first_date.toISOString().slice(0, 10) : String(rows[0].first_date))
    : null;

  const normalized = rows.map((r: any) => ({
    as_of_date: r.as_of_date instanceof Date ? r.as_of_date.toISOString().slice(0, 10) : String(r.as_of_date),
    total_assets: Number(r.total_assets),
    total_liabilities: Number(r.total_liabilities),
    net_worth: Number(r.net_worth),
  }));

  res.json({ dates: normalized.map(r => r.as_of_date), data: normalized, dataStartDate });
});


app.get('/composition/summary', async (req: AuthedRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const query = `
    SELECT
      p.id,
      p.name,
      p.side,
      p.category,
      latest.value,
      latest.source_type,
      latest.as_of_date::text AS last_updated
    FROM positions p
    LEFT JOIN LATERAL (
      SELECT vs.value, vs.source_type, vs.as_of_date
      FROM valuation_snapshots vs
      WHERE vs.position_id = p.id
      ORDER BY vs.as_of_date DESC
      LIMIT 1
    ) latest ON true
    WHERE p.user_id = $1
      AND (p.archived = false OR p.archived IS NULL)
    ORDER BY p.side, p.category, p.name
  `;

  const { rows } = await pool.query(query, [req.userId]);

  const assetMap = new Map<string, { category: string; total: number; positions: { id: string; name: string; value: number | null; sourceType: string | null; lastUpdated: string | null }[] }>();
  const liabilityMap = new Map<string, { category: string; total: number; positions: { id: string; name: string; value: number | null; sourceType: string | null; lastUpdated: string | null }[] }>();
  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const row of rows) {
    const value = row.value !== null ? Number(row.value) : null;
    const positionEntry = { id: row.id, name: row.name, value, sourceType: row.source_type ?? null, lastUpdated: row.last_updated ?? null };
    const map = row.side === 'asset' ? assetMap : liabilityMap;

    if (!map.has(row.category)) {
      map.set(row.category, { category: row.category, total: 0, positions: [] });
    }
    const group = map.get(row.category)!;
    group.positions.push(positionEntry);

    if (value !== null) {
      group.total += value;
      if (row.side === 'asset') totalAssets += value;
      else totalLiabilities += value;
    }
  }

  res.json({
    assets: Array.from(assetMap.values()),
    liabilities: Array.from(liabilityMap.values()),
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
  });
});

app.get('/chart/composition', async (req: AuthedRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const query = `
    WITH date_series AS (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE,
        interval '1 day'
      )::date AS as_of_date
    ),
    categories AS (
      SELECT DISTINCT category, side FROM positions
      WHERE user_id = $1 AND (archived = false OR archived IS NULL)
    ),
    daily_category_totals AS (
      SELECT
        p.category,
        p.side,
        (vs.as_of_date::date) AS as_of_date,
        SUM(vs.value) AS total_value
      FROM valuation_snapshots vs
      INNER JOIN positions p ON p.id = vs.position_id
      WHERE vs.user_id = $1
        AND (vs.as_of_date::date) <= CURRENT_DATE
        AND (p.archived = false OR p.archived IS NULL)
      GROUP BY p.category, p.side, (vs.as_of_date::date)
    ),
    first_known AS (
      SELECT MIN(as_of_date) AS first_date FROM daily_category_totals
    ),
    chart_series AS (
      SELECT
        ds.as_of_date,
        c.category,
        c.side,
        fk.first_date,
        CASE
          WHEN fk.first_date IS NULL OR ds.as_of_date < fk.first_date THEN 0
          ELSE COALESCE(latest.total_value, 0)
        END AS total_value
      FROM date_series ds
      CROSS JOIN categories c
      CROSS JOIN first_known fk
      LEFT JOIN LATERAL (
        SELECT dct.total_value
        FROM daily_category_totals dct
        WHERE dct.category = c.category
          AND dct.side = c.side
          AND dct.as_of_date <= ds.as_of_date
        ORDER BY dct.as_of_date DESC
        LIMIT 1
      ) latest ON true
    )
    SELECT
      cs.as_of_date,
      cs.category,
      cs.side,
      cs.total_value,
      cs.first_date
    FROM chart_series cs
    ORDER BY cs.side ASC, cs.category ASC, cs.as_of_date ASC
  `;

  const { rows } = await pool.query(query, [req.userId]);

  // Extract dates from the first category's rows
  const dates: string[] = [];
  let dataStartDate: string | null = null;
  if (rows.length) {
    const firstRow = rows[0];
    if (firstRow.first_date) {
      dataStartDate = firstRow.first_date instanceof Date
        ? firstRow.first_date.toISOString().slice(0, 10)
        : String(firstRow.first_date);
    }
    const firstKey = `${firstRow.side}:${firstRow.category}`;
    for (const row of rows) {
      if (`${row.side}:${row.category}` !== firstKey) break;
      const d = row.as_of_date instanceof Date ? row.as_of_date.toISOString().slice(0, 10) : String(row.as_of_date);
      dates.push(d);
    }
  }

  // Pivot into per-category value arrays
  const categoryMap = new Map<string, { category: string; side: string; values: number[] }>();
  for (const row of rows) {
    const key = `${row.side}:${row.category}`;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { category: row.category, side: row.side, values: [] });
    }
    categoryMap.get(key)!.values.push(Number(row.total_value));
  }
  const categories = Array.from(categoryMap.values());

  // Net worth per date = sum(assets) - sum(liabilities)
  const netWorth = dates.map((_, i) => {
    let assets = 0;
    let liabilities = 0;
    for (const cat of categories) {
      if (cat.side === 'asset') assets += cat.values[i] ?? 0;
      else liabilities += cat.values[i] ?? 0;
    }
    return assets - liabilities;
  });

  res.json({ dates, categories, netWorth, dataStartDate });
});

app.post('/onboarding/complete', async (req: AuthedRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = req.body;
  if (!Array.isArray(body)) {
    res.status(400).json({ error: 'Expected array' });
    return;
  }

  type OnboardingEntry = { category: string; side: string; label: string; value: number };
  const toInsert: OnboardingEntry[] = (body as OnboardingEntry[]).filter(
    e => typeof e.value === 'number' && e.value !== 0 &&
         allowedCategories.has(e.category) &&
         allowedSides.has(e.side as BalanceSheetSide)
  );

  const today = new Date().toISOString().slice(0, 10);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const entry of toInsert) {
      // Find existing non-archived position matching user + category + side + label
      const existing = await client.query(
        `SELECT id FROM positions
         WHERE user_id = $1
           AND category = $2
           AND side = $3
           AND name = $4
           AND (archived = false OR archived IS NULL)
         LIMIT 1`,
        [req.userId, entry.category, entry.side, entry.label],
      );

      let positionId: string;
      if (existing.rows[0]) {
        positionId = existing.rows[0].id;
      } else {
        const { rows } = await client.query(
          `INSERT INTO positions (user_id, name, side, category, currency_code)
           VALUES ($1, $2, $3, $4, 'USD')
           RETURNING id`,
          [req.userId, entry.label, entry.side, entry.category],
        );
        positionId = rows[0].id;
      }

      await client.query(
        `INSERT INTO valuation_snapshots (user_id, position_id, as_of_date, value, source_type, source_details)
         VALUES ($1, $2, CURRENT_DATE, $3, 'manual', '{}')
         ON CONFLICT (position_id, as_of_date)
         DO UPDATE SET value = EXCLUDED.value, source_type = EXCLUDED.source_type, created_at = NOW()`,
        [req.userId, positionId, entry.value],
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Onboarding complete', positionCount: toInsert.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('onboarding/complete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// ─── Dev-only routes ──────────────────────────────────────────────────────────

app.delete('/dev/reset-user', async (req: AuthedRequest, res: Response): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    await pool.query(
      `DELETE FROM valuation_snapshots
       WHERE position_id IN (SELECT id FROM positions WHERE user_id = $1)`,
      [userId],
    );
    await pool.query('DELETE FROM positions WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'User reset' });
  } catch (err) {
    console.error('dev/reset-user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`API listening on :${port}`);
});
