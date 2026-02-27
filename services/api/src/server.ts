import express, { NextFunction, Request, Response } from 'express';
import { pool } from './db.js';
import { AssetCategory, BalanceSheetSide, LiabilityCategory, PositionCategory, PositionSourceType } from '@finance-clarity/shared';

type AuthedRequest = Request & { userId?: string };

const app = express();
app.use(express.json());

const authMiddleware = (req: AuthedRequest, res: Response, next: NextFunction): void => {
  const userId = req.header('x-user-id');

  if (!userId) {
    res.status(401).json({ error: 'Missing x-user-id header' });
    return;
  }

  req.userId = userId;
  next();
};

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

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
  const { rows } = await pool.query(
    `SELECT * FROM positions WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.userId]
  );

  res.json(rows);
});

app.patch('/positions/:id', async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const { name, category, currencyCode, linkedAccountId, notes } = req.body;

  if (category && !allowedCategories.has(category)) {
    res.status(400).json({ error: 'Invalid category' });
    return;
  }

  const query = `
    UPDATE positions
       SET name = COALESCE($3, name),
           category = COALESCE($4, category),
           currency_code = COALESCE($5, currency_code),
           linked_account_id = COALESCE($6, linked_account_id),
           notes = COALESCE($7, notes),
           updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *
  `;

  const { rows } = await pool.query(query, [
    id,
    req.userId,
    name ?? null,
    category ?? null,
    currencyCode ?? null,
    linkedAccountId ?? null,
    notes ?? null
  ]);

  if (!rows[0]) {
    res.status(404).json({ error: 'Position not found' });
    return;
  }

  res.json(rows[0]);
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
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  if (!req.userId) {
    res.status(401).json({ error: 'Missing x-user-id' });
    return;
  }

  if (!from || !to) {
    res.status(400).json({ error: 'from and to query params are required (YYYY-MM-DD)' });
    return;
  }

  const query = `
    WITH date_series AS (
      SELECT generate_series($2::date, $3::date, interval '1 day')::date AS as_of_date
    ),
    daily_totals AS (
      SELECT
        (vs.as_of_date::date) AS as_of_date,
        SUM(CASE WHEN p.side = 'asset' THEN vs.value ELSE 0 END) AS total_assets,
        SUM(CASE WHEN p.side = 'liability' THEN vs.value ELSE 0 END) AS total_liabilities
      FROM valuation_snapshots vs
      INNER JOIN positions p ON p.id = vs.position_id
      WHERE vs.user_id = $1
        AND (vs.as_of_date::date) <= $3::date
      GROUP BY (vs.as_of_date::date)
    ),
    chart_series AS (
      SELECT
        ds.as_of_date,
        latest.total_assets,
        latest.total_liabilities
      FROM date_series ds
      LEFT JOIN LATERAL (
        SELECT dt.total_assets, dt.total_liabilities
        FROM daily_totals dt
        WHERE dt.as_of_date <= ds.as_of_date
        ORDER BY dt.as_of_date DESC
        LIMIT 1
      ) latest ON true
    ),
    first_known AS (
      SELECT MIN(as_of_date) AS as_of_date
      FROM chart_series
      WHERE total_assets IS NOT NULL OR total_liabilities IS NOT NULL
    )
    SELECT
      cs.as_of_date,
      cs.total_assets,
      cs.total_liabilities,
      cs.total_assets - cs.total_liabilities AS net_worth
    FROM chart_series cs
    CROSS JOIN first_known fk
    WHERE cs.as_of_date >= fk.as_of_date
    ORDER BY cs.as_of_date ASC
  `;

  const { rows } = await pool.query(query, [req.userId, from, to]);

  const normalized = rows.map((r: any) => ({
    as_of_date: r.as_of_date,
    total_assets: Number(r.total_assets),
    total_liabilities: Number(r.total_liabilities),
    net_worth: Number(r.net_worth)
  }));

  res.json(normalized);
});


app.get('/composition/summary', async (req: AuthedRequest, res: Response) => {
  const query = `
    SELECT
      p.id,
      p.name,
      p.side,
      p.category,
      latest.value,
      latest.source_type
    FROM positions p
    LEFT JOIN LATERAL (
      SELECT vs.value, vs.source_type
      FROM valuation_snapshots vs
      WHERE vs.position_id = p.id
      ORDER BY vs.as_of_date DESC
      LIMIT 1
    ) latest ON true
    WHERE p.user_id = $1
    ORDER BY p.side, p.category, p.name
  `;

  const { rows } = await pool.query(query, [req.userId]);

  const assetMap = new Map<string, { category: string; total: number; positions: { id: string; name: string; value: number | null; sourceType: string | null }[] }>();
  const liabilityMap = new Map<string, { category: string; total: number; positions: { id: string; name: string; value: number | null; sourceType: string | null }[] }>();
  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const row of rows) {
    const value = row.value !== null ? Number(row.value) : null;
    const positionEntry = { id: row.id, name: row.name, value, sourceType: row.source_type ?? null };
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
  const from = req.query.from as string | undefined;
  const to   = req.query.to   as string | undefined;

  if (!from || !to) {
    res.status(400).json({ error: 'from and to query params are required (YYYY-MM-DD)' });
    return;
  }

  const query = `
    WITH date_series AS (
      SELECT generate_series($2::date, $3::date, interval '1 day')::date AS as_of_date
    ),
    categories AS (
      SELECT DISTINCT category, side FROM positions WHERE user_id = $1
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
        AND (vs.as_of_date::date) <= $3::date
      GROUP BY p.category, p.side, (vs.as_of_date::date)
    ),
    chart_series AS (
      SELECT
        ds.as_of_date,
        c.category,
        c.side,
        latest.total_value
      FROM date_series ds
      CROSS JOIN categories c
      LEFT JOIN LATERAL (
        SELECT dct.total_value
        FROM daily_category_totals dct
        WHERE dct.category = c.category
          AND dct.side = c.side
          AND dct.as_of_date <= ds.as_of_date
        ORDER BY dct.as_of_date DESC
        LIMIT 1
      ) latest ON true
    ),
    first_known AS (
      SELECT MIN(as_of_date) AS as_of_date
      FROM chart_series
      WHERE total_value IS NOT NULL
    )
    SELECT
      cs.as_of_date,
      cs.category,
      cs.side,
      COALESCE(cs.total_value, 0) AS total_value
    FROM chart_series cs
    CROSS JOIN first_known fk
    WHERE cs.as_of_date >= fk.as_of_date
    ORDER BY cs.side ASC, cs.category ASC, cs.as_of_date ASC
  `;

  const { rows } = await pool.query(query, [req.userId, from, to]);

  // Extract dates from the first category's rows
  const dates: string[] = [];
  if (rows.length) {
    const firstKey = `${rows[0].side}:${rows[0].category}`;
    for (const row of rows) {
      if (`${row.side}:${row.category}` !== firstKey) break;
      dates.push(row.as_of_date);
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

  res.json({ dates, categories, netWorth });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`API listening on :${port}`);
});
