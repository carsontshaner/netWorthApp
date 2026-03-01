import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line, Path, Polyline } from "react-native-svg";

import { BalanceSheetChart } from "@/components/balance-sheet-chart";
import InfoButton from "@/components/InfoButton";
import { fetchCompositionChart, API_BASE, type CompositionChartData, type CategorySeries } from "@/src/api";
import { clearToken, isGuestSession, getGuestData, clearGuestSession, buildGuestChartData, getToken } from "@/src/auth";
import { harborWordmark } from "@/src/theme";

const LEGEND_COLORS = [
  '#7FB3C8', // short-term assets (top of asset stack)
  '#C8B89A', // transitioning through long-term asset range
  '#8A6F4E', // long-term assets (closest to x-axis)
  '#8B6347', // long-term liabilities (closest to x-axis)
  '#4A2E1A', // transitioning through long-term liability range
  '#D4B89A', // short-term liabilities (top of liability stack)
] as const;

function formatNetWorth(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  if (value < 0) return `($${formatted})`;
  return `$${formatted}`;
}

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
      <View onLayout={onBarLayout}>
        <LinearGradient
          colors={LEGEND_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 10, borderRadius: 99 }}
        />
      </View>

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

      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row' }}>
            <Text style={{ ...labelStyle, flex: 1, textAlign: 'center' }}>Short</Text>
            <Text style={{ ...labelStyle, flex: 1, textAlign: 'center' }}>Long</Text>
          </View>
          <Text style={sectionTitleStyle}>Assets</Text>
        </View>

        <View style={{ width: 1, backgroundColor: 'rgba(39,35,28,0.12)', marginHorizontal: 8 }} />

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

function FirstTimerPlaceholder({ height, onStart }: { height: number; onStart: () => void }) {
  const bx = 0.6; // baseline at 60% of height

  return (
    <View style={{ height, marginHorizontal: 0, position: 'relative' }}>
      {/* Static chart mockup */}
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 375 ${height}`}
        preserveAspectRatio="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        {/* Asset band 1 — short-term */}
        <Path
          d={`M0,${height*bx} C60,${height*0.52} 140,${height*0.47} 220,${height*0.44} C290,${height*0.41} 340,${height*0.39} 375,${height*0.37} L375,${height*bx} Z`}
          fill="#A9D6CF" opacity={0.2}
        />
        {/* Asset band 2 — mid-term */}
        <Path
          d={`M0,${height*0.44} C60,${height*0.38} 140,${height*0.33} 220,${height*0.30} C290,${height*0.28} 340,${height*0.26} 375,${height*0.24} L375,${height*0.37} C340,${height*0.39} 290,${height*0.41} 220,${height*0.44} C140,${height*0.47} 60,${height*0.52} 0,${height*bx} Z`}
          fill="#7FB3C8" opacity={0.2}
        />
        {/* Asset band 3 — long-term */}
        <Path
          d={`M0,${height*0.24} C80,${height*0.20} 160,${height*0.17} 240,${height*0.15} C310,${height*0.13} 350,${height*0.12} 375,${height*0.11} L375,${height*0.24} C340,${height*0.26} 290,${height*0.28} 220,${height*0.30} C140,${height*0.33} 60,${height*0.38} 0,${height*0.44} Z`}
          fill="#8A6F4E" opacity={0.2}
        />
        {/* Liability band 1 */}
        <Path
          d={`M0,${height*bx} C80,${height*0.65} 160,${height*0.68} 240,${height*0.71} C300,${height*0.73} 340,${height*0.75} 375,${height*0.77} L375,${height*bx} Z`}
          fill="#8B6347" opacity={0.2}
        />
        {/* Liability band 2 */}
        <Path
          d={`M0,${height*0.77} C80,${height*0.81} 160,${height*0.84} 240,${height*0.86} C300,${height*0.87} 340,${height*0.88} 375,${height*0.89} L375,${height*0.77} C340,${height*0.75} 300,${height*0.73} 240,${height*0.71} C160,${height*0.68} 80,${height*0.65} 0,${height*bx} Z`}
          fill="#D4B89A" opacity={0.2}
        />
        {/* X-axis baseline */}
        <Line x1={0} y1={height*bx} x2={375} y2={height*bx} stroke="#27231C" strokeWidth={2} opacity={0.15} />
        {/* Net worth polyline */}
        <Polyline
          points={`0,${height*0.54} 60,${height*0.50} 130,${height*0.46} 200,${height*0.43} 270,${height*0.40} 330,${height*0.37} 375,${height*0.35}`}
          fill="none" stroke="#5B4A3A" strokeWidth={3} opacity={0.2}
          strokeLinejoin="round" strokeLinecap="round"
        />
      </Svg>

      {/* White-sand overlay to dim the mockup */}
      <View
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(243,231,211,0.55)',
        }}
      />

      {/* Centered call-to-action */}
      <View
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: '300',
            color: '#27231C',
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Build your picture.
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '300',
            color: 'rgba(39,35,28,0.55)',
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          {'Add your assets and liabilities to\nsee your real net worth here.'}
        </Text>
        <Pressable
          onPress={onStart}
          style={{
            backgroundColor: '#5B4A3A',
            paddingVertical: 14,
            paddingHorizontal: 32,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '500', color: '#F3E7D3' }}>Start here →</Text>
        </Pressable>
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
  const [isGuest, setIsGuest] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        if (await isGuestSession()) {
          setIsGuest(true);
          const guestData = await getGuestData();
          if (guestData && guestData.positions.length > 0) {
            const built = buildGuestChartData(guestData.positions);
            // Group positions by category+side to build CategorySeries
            const groupMap = new Map<string, { category: string; side: 'asset' | 'liability'; total: number }>();
            for (const pos of built.compositionData) {
              const key = `${pos.category}_${pos.side}`;
              const g = groupMap.get(key);
              if (g) g.total += pos.value;
              else groupMap.set(key, { category: pos.category, side: pos.side, total: pos.value });
            }
            const categories: CategorySeries[] = Array.from(groupMap.values()).map(g => ({
              category: g.category,
              side: g.side,
              values: built.netWorthData.map(p => p.date >= built.dataStartDate ? g.total : 0),
            }));
            setData({
              dates: built.netWorthData.map(p => p.date),
              netWorth: built.netWorthData.map(p => p.value),
              categories,
              dataStartDate: built.dataStartDate,
            });
          } else {
            setData({ dates: [], categories: [], netWorth: [], dataStartDate: null });
          }
        } else {
          setIsGuest(false);
          fetchCompositionChart()
            .then(setData)
            .catch((e) => setError(e?.message ?? "Unknown error"));
        }
      }
      load();
    }, [])
  );

  function handleCreateAccount() {
    Alert.alert(
      'Create an account',
      'Would you like to keep the data you entered as a guest?',
      [
        {
          text: 'Keep my data',
          onPress: () => router.push('/auth/email?mode=signup&mergeGuest=true'),
        },
        {
          text: 'Start fresh',
          onPress: () => {
            clearGuestSession();
            router.push('/auth/email?mode=signup');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  const isFirstTimer = !!data && (
    data.netWorth.length === 0 || data.netWorth.every(v => v === 0)
  );

  const chartHeight = screenHeight * 0.6;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3E7D3" }}>
      {/* Temporary sign-out button — remove before launch */}
      <Pressable
        onPress={() => {
          Alert.alert(
            'Sign out',
            'Are you sure you want to sign out of Harbor?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Sign out',
                style: 'destructive',
                onPress: async () => {
                  await clearToken();
                  router.replace('/landing');
                },
              },
            ],
          );
        }}
        style={{ position: 'absolute', top: insets.top + 12, right: 20, zIndex: 10 }}
      >
        <Text style={{ fontSize: 12, color: 'rgba(39,35,28,0.40)' }}>Sign out</Text>
      </Pressable>

      {__DEV__ && (
        <Pressable
          onPress={async () => {
            const token = await getToken();
            await fetch(`${API_BASE}/dev/reset-user`, {
              method: 'DELETE',
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            await clearToken();
            router.replace('/landing');
          }}
          style={{ position: 'absolute', top: insets.top + 34, right: 20, zIndex: 10 }}
        >
          <Text style={{ fontSize: 11, color: 'rgba(39,35,28,0.25)' }}>Reset (dev only)</Text>
        </Pressable>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Harbor wordmark + net worth number */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <Text style={{ ...harborWordmark, textAlign: "center" }}>
            Harbor
          </Text>

          {isGuest && (
            <View style={{
              backgroundColor: '#EDE0CC',
              borderRadius: 8,
              paddingVertical: 8,
              paddingHorizontal: 12,
              marginTop: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Text style={{ fontSize: 12, color: '#5B4A3A', flex: 1 }}>
                {"You're in guest mode — create an account to save your data"}
              </Text>
              <Pressable onPress={handleCreateAccount} style={{ marginLeft: 8 }}>
                <Text style={{ fontSize: 12, color: '#5B4A3A', fontWeight: '500' }}>
                  Create account
                </Text>
              </Pressable>
            </View>
          )}

          {error ? (
            <Text style={{ marginTop: 12, fontSize: 16 }}>{error}</Text>
          ) : !data ? (
            <View style={{ marginTop: 16 }}>
              <ActivityIndicator />
            </View>
          ) : isFirstTimer ? null : (
            <Text style={{ marginTop: 8, fontSize: 44, fontWeight: "600", textAlign: "center" }}>
              {formatNetWorth(data.netWorth[data.netWorth.length - 1] ?? 0)}
            </Text>
          )}
        </View>

        {/* Chart or first-timer placeholder */}
        {data && (
          isFirstTimer ? (
            <FirstTimerPlaceholder
              height={chartHeight}
              onStart={() => router.push('/onboarding')}
            />
          ) : (
            <Pressable onPress={() => router.push("/composition")}>
              <BalanceSheetChart data={data} height={chartHeight} dataStartDate={data.dataStartDate ?? undefined} />
            </Pressable>
          )
        )}

        {/* Legend + links (hidden for first-timers) */}
        {data && !isFirstTimer && (
          <>
            <ChartLegend />
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={{ marginTop: 12, fontSize: 12, opacity: 0.6 }}>Updated today</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/composition")}
                style={{ marginTop: 6, alignSelf: "flex-start", paddingVertical: 4 }}
              >
                <Text style={{ fontSize: 14, opacity: 0.72 }}>See depth →</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/onboarding')}
                style={{ marginTop: 8, alignSelf: 'flex-start', paddingVertical: 4 }}
              >
                <Text style={{ fontSize: 13, color: 'rgba(39,35,28,0.50)' }}>
                  Update my picture
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <InfoButton
        onSelect={(key) => {
          if (key === 'profile') {
            console.log('Profile tapped');
          } else if (key === 'settings') {
            console.log('Settings tapped');
          } else if (key === 'information') {
            console.log('Information tapped');
          } else if (key === 'disclosures') {
            console.log('Disclosures tapped');
          }
        }}
      />
    </SafeAreaView>
  );
}
