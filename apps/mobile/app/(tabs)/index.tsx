import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { BalanceSheetChart } from "@/components/balance-sheet-chart";
import { fetchNetWorth, type NetWorthPoint } from "@/src/api";

export default function HomeScreen() {
  const router = useRouter();
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
          <>
            <Text style={{ marginTop: 8, fontSize: 44, fontWeight: "600" }}>
              ${latest?.net_worth.toLocaleString()}
            </Text>
            <BalanceSheetChart points={data} />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/composition")}
              style={{ marginTop: 12, alignSelf: "flex-start", paddingVertical: 4 }}
            >
              <Text style={{ fontSize: 14, opacity: 0.72 }}>
                See composition →
              </Text>
            </Pressable>
          </>
        )}

        <Text style={{ marginTop: 6, fontSize: 12, opacity: 0.6 }}>
          Updated today
        </Text>
      </View>
    </SafeAreaView>
  );
}
