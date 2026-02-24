import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, Text, View } from "react-native";

const API_BASE = "http://192.168.1.158:4000";

type NetWorthPoint = {
  as_of_date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
};

async function fetchNetWorth(): Promise<NetWorthPoint[]> {
  const res = await fetch(
    `${API_BASE}/chart/networth?from=2026-02-16&to=2026-02-16`,
    {
      headers: {
        "x-user-id": "user_1",
      },
    }
  );

  if (!res.ok) throw new Error("Failed to fetch net worth");
  return res.json();
}

export default function HomeScreen() {
  const [data, setData] = useState<NetWorthPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNetWorth()
      .then(setData)
      .catch((e) => setError(e?.message ?? "Unknown error"));
  }, []);

  const latest = data?.length ? data[data.length - 1] : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3E7D3" }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
        <Text style={{ fontSize: 14, opacity: 0.7 }}>Net worth</Text>

        {error ? (
          <Text style={{ marginTop: 12, fontSize: 16 }}>{error}</Text>
        ) : !data ? (
          <View style={{ marginTop: 16 }}>
            <ActivityIndicator />
          </View>
        ) : (
          <Text style={{ marginTop: 8, fontSize: 44, fontWeight: "600" }}>
            ${latest?.net_worth.toLocaleString()}
          </Text>
        )}

        <Text style={{ marginTop: 6, fontSize: 12, opacity: 0.6 }}>
          Updated today
        </Text>
      </View>
    </SafeAreaView>
  );
}