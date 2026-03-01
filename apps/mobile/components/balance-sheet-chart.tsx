import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, View, useWindowDimensions } from "react-native";
// eslint-disable-next-line import/no-unresolved
import Svg, { Line, Path, Polyline } from "react-native-svg";

import type { ViewStyle } from "react-native";

import type { CompositionChartData } from "@/src/api";
import { categoryColor, categoryOrder, theme } from "@/src/theme";

type Props = {
  data: CompositionChartData;
  height?: number;
  containerStyle?: ViewStyle;
  dataStartDate?: string;
};

const PADDING = 14;

type Coordinate = {
  x: number;
  y: number;
};

function buildCoordinates(
  values: number[],
  min: number,
  max: number,
  chartWidth: number,
  chartHeight: number,
): Coordinate[] {
  if (!values.length) return [];

  const range       = max - min || 1;
  const innerWidth  = chartWidth  - PADDING * 2;
  const innerHeight = chartHeight - PADDING * 2;

  return values.map((value, index) => ({
    x: PADDING + (index / Math.max(values.length - 1, 1)) * innerWidth,
    y: PADDING + (1 - (value - min) / range) * innerHeight,
  }));
}

function toAreaPath(points: Coordinate[], baselineY: number): string {
  if (!points.length) return "";
  const lineSegment = points.map(({ x, y }) => `L ${x} ${y}`).join(" ");
  const first = points[0];
  const last  = points[points.length - 1];
  return `M ${first.x} ${baselineY} ${lineSegment} L ${last.x} ${baselineY} Z`;
}

function toStackedPath(topCoords: Coordinate[], bottomCoords: Coordinate[]): string {
  if (!topCoords.length || !bottomCoords.length) return "";
  const topParts    = topCoords.map(({ x, y }) => `L ${x} ${y}`);
  const bottomParts = [...bottomCoords].reverse().map(({ x, y }) => `L ${x} ${y}`);
  return `M ${topCoords[0].x} ${topCoords[0].y} ${topParts.slice(1).join(" ")} ${bottomParts.join(" ")} Z`;
}

export function BalanceSheetChart({ data, height = 260, containerStyle, dataStartDate }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const CHART_WIDTH  = windowWidth;
  const CHART_HEIGHT = height;

  const n = data.dates.length;

  // Sort by stacking order, then split by side
  const sorted = [...data.categories].sort(
    (a, b) => categoryOrder(a.category, a.side) - categoryOrder(b.category, b.side),
  );
  const assetCats     = sorted.filter((c) => c.side === "asset");
  const liabilityCats = sorted.filter((c) => c.side === "liability");
  const zeros = new Array(n).fill(0);

  // Cumulative stacks: positive for assets, negative for liabilities
  const assetStacks: number[][] = [];
  for (let k = 0; k < assetCats.length; k++) {
    const prev = assetStacks[k - 1] ?? zeros;
    assetStacks.push(prev.map((v, i) => v + (assetCats[k].values[i] ?? 0)));
  }

  const liabilityStacks: number[][] = [];
  for (let k = 0; k < liabilityCats.length; k++) {
    const prev = liabilityStacks[k - 1] ?? zeros;
    liabilityStacks.push(prev.map((v, i) => v - (liabilityCats[k].values[i] ?? 0)));
  }

  const allValues = [
    0,
    ...(assetStacks[assetStacks.length - 1] ?? []),
    ...(liabilityStacks[liabilityStacks.length - 1] ?? []),
    ...data.netWorth,
  ];
  const scaleMin = Math.min(...allValues);
  const scaleMax = Math.max(...allValues);

  const build = (vals: number[]) =>
    buildCoordinates(vals, scaleMin, scaleMax, CHART_WIDTH, CHART_HEIGHT);

  const baselineY      = build([0])[0]?.y ?? CHART_HEIGHT - PADDING;
  const netWorthCoords = build(data.netWorth);
  const hasTrend       = netWorthCoords.length > 1;

  // x-position of the data start marker
  const dataStartX = (() => {
    if (!dataStartDate || data.dates.length < 2) return null;
    const idx = data.dates.findIndex(d => d === dataStartDate);
    if (idx < 0) return null;
    const innerWidth = CHART_WIDTH - PADDING * 2;
    return PADDING + (idx / Math.max(data.dates.length - 1, 1)) * innerWidth;
  })();

  return (
    <View style={{ marginTop: 24, ...containerStyle }}>
      <View style={{ width: "100%", height: CHART_HEIGHT }}>
        {hasTrend && (
          <Svg
            width="100%"
            height={CHART_HEIGHT}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            style={{ position: "absolute", left: 0, top: 0 }}>

            {/* Asset stacked areas — above baseline */}
            {assetCats.map((cat, k) => {
              const topCoords    = build(assetStacks[k]);
              const bottomCoords = build(assetStacks[k - 1] ?? zeros);
              return (
                <React.Fragment key={cat.category}>
                  <Path
                    d={toStackedPath(topCoords, bottomCoords)}
                    fill={categoryColor(cat.category, "asset", k, assetCats.length)}
                    opacity={0.85}
                  />
                  <Polyline
                    points={topCoords.map(({ x, y }) => `${x},${y}`).join(" ")}
                    fill="none"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth={1}
                  />
                </React.Fragment>
              );
            })}

            {/* Liability stacked areas — below baseline */}
            {liabilityCats.map((cat, k) => {
              const bottomCoords = build(liabilityStacks[k]);
              const topCoords    = build(liabilityStacks[k - 1] ?? zeros);
              return (
                <React.Fragment key={cat.category}>
                  <Path
                    d={toStackedPath(topCoords, bottomCoords)}
                    fill={categoryColor(cat.category, "liability", k, liabilityCats.length)}
                    opacity={0.85}
                  />
                  <Polyline
                    points={topCoords.map(({ x, y }) => `${x},${y}`).join(" ")}
                    fill="none"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth={1}
                  />
                </React.Fragment>
              );
            })}

            {/* X-axis baseline — on top of fills, below net worth line */}
            <Line
              x1={0}
              y1={baselineY}
              x2={CHART_WIDTH}
              y2={baselineY}
              stroke={theme.text.primary}
              strokeWidth={3}
              opacity={0.85}
            />

            {/* Net worth shading */}
            <Path
              d={toAreaPath(netWorthCoords, baselineY)}
              fill={theme.netWorth.line}
              opacity={0.30}
            />

            {/* Net worth halo — sits behind the line for contrast */}
            <Polyline
              points={netWorthCoords.map(({ x, y }) => `${x},${y}`).join(" ")}
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={12}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Net worth line */}
            <Polyline
              points={netWorthCoords.map(({ x, y }) => `${x},${y}`).join(" ")}
              fill="none"
              stroke={theme.netWorth.line}
              strokeWidth={6}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Data start marker — dashed vertical line */}
            {dataStartX !== null && (
              <Line
                x1={dataStartX}
                y1={0}
                x2={dataStartX}
                y2={CHART_HEIGHT}
                stroke="rgba(39,35,28,0.50)"
                strokeWidth={1.5}
                strokeDasharray="4,4"
              />
            )}
          </Svg>
        )}

        {!hasTrend && (
          <View
            style={{
              position: "absolute",
              left: "20%",
              right: "20%",
              top: CHART_HEIGHT * 0.48,
              height: 3,
              borderRadius: 99,
              backgroundColor: "#8B7A69",
            }}
          />
        )}

        <LinearGradient
          colors={['#F3E7D3', 'rgba(243,231,211,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: dataStartX !== null ? dataStartX : '30%' }}
          pointerEvents="none"
        />
      </View>

      {!hasTrend && (
        <Text style={{ fontSize: 13, opacity: 0.65, marginTop: 6, textAlign: "center" }}>
          Add more days to see a trend
        </Text>
      )}
    </View>
  );
}
