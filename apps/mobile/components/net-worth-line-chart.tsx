import React from "react";
import { Text, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";

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

function createCoordinates(values: number[]): Coordinate[] {
  if (!values.length) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerWidth = CHART_WIDTH - PADDING * 2;
  const innerHeight = CHART_HEIGHT - PADDING * 2;

  return values.map((value, index) => ({
    x: PADDING + (index / Math.max(values.length - 1, 1)) * innerWidth,
    y: PADDING + (1 - (value - min) / range) * innerHeight,
  }));
}

export function NetWorthLineChart({ points }: Props) {
  const values = points.map((point) => point.net_worth);
  const coordinates = createCoordinates(values);
  const hasTrend = coordinates.length > 1;

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

        {hasTrend &&
          (() => {
            const polylinePoints = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");

            return (
              <Svg
                width="100%"
                height={CHART_HEIGHT}
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                style={{ position: "absolute", left: 0, top: 0 }}>
                <Polyline
                  points={polylinePoints}
                  fill="none"
                  stroke="#5B4A3A"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </Svg>
            );
          })()}

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
