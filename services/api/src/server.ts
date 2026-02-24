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
        AND (vs.as_of_date::date) BETWEEN $2::date AND $3::date
      GROUP BY (vs.as_of_date::date)
    )
    SELECT
      ds.as_of_date,
      COALESCE(latest.total_assets, 0) AS total_assets,
      COALESCE(latest.total_liabilities, 0) AS total_liabilities,
      COALESCE(latest.total_assets, 0) - COALESCE(latest.total_liabilities, 0) AS net_worth
    FROM date_series ds
    LEFT JOIN LATERAL (
      SELECT dt.total_assets, dt.total_liabilities
      FROM daily_totals dt
      WHERE dt.as_of_date <= ds.as_of_date
      ORDER BY dt.as_of_date DESC
      LIMIT 1
    ) latest ON true
    ORDER BY ds.as_of_date ASC
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


const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`API listening on :${port}`);
});
