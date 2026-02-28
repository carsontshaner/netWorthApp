import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BalanceSheetChart } from "@/components/balance-sheet-chart";
import { fetchCompositionChart, type CompositionChartData } from "@/src/api";
import { clearToken } from "@/src/auth";

const APP_NAME = "Harbor";

const LEGEND_COLORS = [
  '#7FB3C8', // short-term assets (top of asset stack)
  '#C8B89A', // transitioning through long-term asset range
  '#8A6F4E', // long-term assets (closest to x-axis)
  '#8B6347', // long-term liabilities (closest to x-axis)
  '#4A2E1A', // transitioning through long-term liability range
  '#D4B89A', // short-term liabilities (top of liability stack)
] as const;

function ChartLegend() {
  const [barWidth, setBarWidth] = useState(0);

  function onBarLayout(e: LayoutChangeEvent) {
    setBarWidth(e.nativeEvent.layout.width);
  }

  const ticks = [
    { pct: 0.25, height: 6,  opacity: 'rgba(39,35,28,0.20)' },
    { pct: 0.50, height: 8,  opacity: 'rgba(39,35,28,0.35)' },
    { pct: 0.75, height: 6,  opacity: 'rgba(39,35,28,0.20)' },
  ];

  const labelStyle = {
    fontSize: 9,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
    opacity: 0.40,
  };

  const sectionTitleStyle = {
    fontSize: 12,
    fontWeight: '500' as const,
    opacity: 0.70,
    textAlign: 'center' as const,
    marginTop: 2,
  };

  return (
    <View style={{ marginTop: 16, paddingHorizontal: 20 }}>
      {/* Gradient bar */}
      <View onLayout={onBarLayout}>
        <LinearGradient
          colors={LEGEND_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 10, borderRadius: 99 }}
        />
      </View>

      {/* Tick marks */}
      <View style={{ height: 8, position: 'relative' }}>
        {barWidth > 0 && ticks.map(({ pct, height, opacity }) => (
          <View
            key={pct}
            style={{
              position: 'absolute',
              left: barWidth * pct - 0.5,
              top: 0,
              width: 1,
              height,
              backgroundColor: opacity,
            }}
          />
        ))}
      </View>

      {/* Two-column labels */}
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        {/* Assets */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row' }}>
            <Text style={{ ...labelStyle, flex: 1, textAlign: 'center' }}>Short</Text>
            <Text style={{ ...labelStyle, flex: 1, textAlign: 'center' }}>Long</Text>
          </View>
          <Text style={sectionTitleStyle}>Assets</Text>
        </View>

        {/* Center divider */}
        <View style={{ width: 1, backgroundColor: 'rgba(39,35,28,0.12)', marginHorizontal: 8 }} />

        {/* Liabilities */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row' }}>
            <Text style={{ ...labelStyle, flex: 1, textAlign: 'center' }}>Long</Text>
            <Text style={{ ...labelStyle, flex: 1, textAlign: 'center' }}>Short</Text>
          </View>
          <Text style={sectionTitleStyle}>Liabilities</Text>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [data, setData] = useState<CompositionChartData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompositionChart()
      .then(setData)
      .catch((e) => setError(e?.message ?? "Unknown error"));
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3E7D3" }}>
      {/* Temporary sign-out button — remove before launch */}
      <Pressable
        onPress={async () => { await clearToken(); router.replace('/landing'); }}
        style={{ position: 'absolute', top: insets.top + 12, right: 20, zIndex: 10 }}
      >
        <Text style={{ fontSize: 12, color: 'rgba(39,35,28,0.40)' }}>Sign out</Text>
      </Pressable>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
      {/* Harbor label + net worth number */}
      <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
        <Text style={{ fontSize: 28, fontWeight: "300", opacity: 0.7, textAlign: "center" }}>
          {APP_NAME}
        </Text>

        {error ? (
          <Text style={{ marginTop: 12, fontSize: 16 }}>{error}</Text>
        ) : !data ? (
          <View style={{ marginTop: 16 }}>
            <ActivityIndicator />
          </View>
        ) : (
          <Text style={{ marginTop: 8, fontSize: 44, fontWeight: "600", textAlign: "center" }}>
            ${data.netWorth[data.netWorth.length - 1]?.toLocaleString()}
          </Text>
        )}
      </View>

      {/* Full-width chart — tappable shortcut to depth screen */}
      {data && (
        <Pressable onPress={() => router.push("/composition")}>
          <BalanceSheetChart data={data} height={screenHeight * 0.6} />
        </Pressable>
      )}

      {/* Legend */}
      {data && <ChartLegend />}

      {/* See composition link + updated label */}
      {data && (
        <View style={{ paddingHorizontal: 20 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/composition")}
            style={{ marginTop: 12, alignSelf: "flex-start", paddingVertical: 4 }}
          >
            <Text style={{ fontSize: 14, opacity: 0.72 }}>
              See depth →
            </Text>
          </Pressable>
          <Text style={{ marginTop: 6, fontSize: 12, opacity: 0.6 }}>
            Updated today
          </Text>
        </View>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}
