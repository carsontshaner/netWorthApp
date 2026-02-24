import React from "react";
import { Text, View } from "react-native";
// eslint-disable-next-line import/no-unresolved
import Svg, { Path, Polyline } from "react-native-svg";

import type { NetWorthPoint } from "@/src/api";

type Props = {
  points: NetWorthPoint[];
};

const CHART_HEIGHT = 160;
const CHART_WIDTH = 320;
const PADDING = 14;

type Coordinate = {
  x: number;
  y: number;
};

function buildCoordinates(values: number[], min: number, max: number): Coordinate[] {
  if (!values.length) return [];

  const range = max - min || 1;
  const innerWidth = CHART_WIDTH - PADDING * 2;
  const innerHeight = CHART_HEIGHT - PADDING * 2;

  return values.map((value, index) => ({
    x: PADDING + (index / Math.max(values.length - 1, 1)) * innerWidth,
    y: PADDING + (1 - (value - min) / range) * innerHeight,
  }));
}

function toAreaPath(points: Coordinate[], baselineY: number): string {
  if (!points.length) return "";

  const lineSegment = points.map(({ x, y }) => `L ${x} ${y}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];

  return `M ${first.x} ${baselineY} ${lineSegment} L ${last.x} ${baselineY} Z`;
}

export function BalanceSheetChart({ points }: Props) {
  const assets = points.map((point) => point.total_assets);
  const liabilities = points.map((point) => point.total_liabilities);
  const netWorth = points.map((point) => point.net_worth);

  const scaleMin = Math.min(0, ...assets, ...liabilities, ...netWorth);
  const scaleMax = Math.max(0, ...assets, ...liabilities, ...netWorth);

  const assetsCoords = buildCoordinates(assets, scaleMin, scaleMax);
  const liabilitiesCoords = buildCoordinates(liabilities, scaleMin, scaleMax);
  const netWorthCoords = buildCoordinates(netWorth, scaleMin, scaleMax);

  const hasTrend = netWorthCoords.length > 1;
  const baselineY = buildCoordinates([0], scaleMin, scaleMax)[0]?.y ?? CHART_HEIGHT - PADDING;

  return (
    <View
      style={{
        marginTop: 24,
        backgroundColor: "rgba(255,255,255,0.3)",
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 10,
      }}>
      <View style={{ width: "100%", height: CHART_HEIGHT }}>
        <View
          style={{
            position: "absolute",
            left: PADDING,
            right: PADDING,
            bottom: PADDING,
            height: 1,
            backgroundColor: "rgba(39, 35, 28, 0.16)",
          }}
        />

        {hasTrend && (
          <Svg
            width="100%"
            height={CHART_HEIGHT}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            style={{ position: "absolute", left: 0, top: 0 }}>
            <Path d={toAreaPath(assetsCoords, baselineY)} fill="rgba(103, 165, 180, 0.45)" />
            <Path d={toAreaPath(liabilitiesCoords, baselineY)} fill="rgba(136, 123, 102, 0.28)" />
            <Polyline
              points={netWorthCoords.map(({ x, y }) => `${x},${y}`).join(" ")}
              fill="none"
              stroke="#405E67"
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
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
      </View>

      {!hasTrend && (
        <Text style={{ fontSize: 13, opacity: 0.65, marginTop: 6, textAlign: "center" }}>
          Add more days to see a trend
        </Text>
      )}
    </View>
  );
}
