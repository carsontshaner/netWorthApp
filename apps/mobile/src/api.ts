export const API_BASE = "http://192.168.1.158:4000";

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
        "x-user-id": "user_1"
      }
    }
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
      "x-user-id": "user_1",
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
};

export async function fetchCompositionChart(): Promise<CompositionChartData> {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - 30);

  const from = formatDateYYYYMMDD(fromDate);
  const to = formatDateYYYYMMDD(toDate);

  const res = await fetch(
    `${API_BASE}/chart/composition?from=${from}&to=${to}`,
    {
      headers: {
        "x-user-id": "user_1",
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