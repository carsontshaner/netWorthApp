import { getToken } from './auth';

export const API_BASE = "http://192.168.1.158:4000";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export type NetWorthPoint = {
  as_of_date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
};

export async function fetchNetWorth(): Promise<NetWorthPoint[]> {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - 30);

  const from = formatDateYYYYMMDD(fromDate);
  const to = formatDateYYYYMMDD(toDate);

  const res = await fetch(
    `${API_BASE}/chart/networth?from=${from}&to=${to}`,
    {
      headers: {
        ...await getAuthHeaders(),
      },
    },
  );

  if (!res.ok) {
    throw new Error("Failed to fetch net worth");
  }

  return res.json();
}

type CompositionPosition = {
  id: string;
  name: string;
  value: number | null;
  sourceType: string;
  lastUpdated: string | null;
};

type CompositionGroup = {
  category: string;
  total: number;
  positions: CompositionPosition[];
};

export type CompositionSummary = {
  assets: CompositionGroup[];
  liabilities: CompositionGroup[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
};

export async function fetchComposition(): Promise<CompositionSummary> {
  const res = await fetch(`${API_BASE}/composition/summary`, {
    headers: {
      ...await getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch composition");
  }

  return res.json();
}

export type CategorySeries = {
  category: string;
  side: 'asset' | 'liability';
  values: number[];
};

export type CompositionChartData = {
  dates: string[];
  categories: CategorySeries[];
  netWorth: number[];
  dataStartDate?: string | null;
};

export async function fetchCompositionChart(): Promise<CompositionChartData> {
  const res = await fetch(
    `${API_BASE}/chart/composition`,
    {
      headers: {
        ...await getAuthHeaders(),
      },
    },
  );

  if (!res.ok) {
    throw new Error("Failed to fetch composition chart");
  }

  return res.json();
}

function formatDateYYYYMMDD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
