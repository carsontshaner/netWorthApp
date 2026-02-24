export const API_BASE = "http://192.168.1.158:4000";

export async function fetchNetWorth() {
  const res = await fetch(
    `${API_BASE}/chart/networth?from=2026-02-16&to=2026-02-16`,
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