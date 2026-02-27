import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, LayoutChangeEvent, SafeAreaView, ScrollView, Text, View } from "react-native";

import { fetchComposition, type CompositionSummary } from "@/src/api";
import { categoryColor, categoryOrder } from "@/src/theme";

const DEPTH_GRADIENT_COLORS = [
  '#7FB3C8', '#C8B89A', '#8A6F4E', '#8B6347', '#4A2E1A', '#D4B89A',
] as const;

function toTitleCase(str: string): string {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function CompositionScreen() {
  const [data, setData] = useState<CompositionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groupsTop, setGroupsTop] = useState(0);

  function onGroupsLayout(e: LayoutChangeEvent) {
    setGroupsTop(e.nativeEvent.layout.y);
  }

  useEffect(() => {
    fetchComposition()
      .then(setData)
      .catch((e) => setError(e?.message ?? "Unknown error"));
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3E7D3" }}>
      <View style={{ flex: 1, position: "relative" }}>
        <LinearGradient
          colors={DEPTH_GRADIENT_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: "absolute", left: 0, top: groupsTop, bottom: 0, width: 4 }}
          pointerEvents="none"
        />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        style={{ flex: 1 }}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
        <Text style={{ fontSize: 34, fontWeight: "600" }}>
          Depth
        </Text>

        {error ? (
          <Text style={{ marginTop: 12, fontSize: 16 }}>{error}</Text>
        ) : !data ? (
          <View style={{ marginTop: 16 }}>
            <ActivityIndicator />
          </View>
        ) : (
          <View onLayout={onGroupsLayout} style={{ marginTop: 24, gap: 20 }}>
            {(
              [
                { title: "Assets",      groups: [...data.assets].sort((a, b) => categoryOrder(a.category, "asset") - categoryOrder(b.category, "asset")),           side: "asset"      as const },
                { title: "Liabilities", groups: [...data.liabilities].sort((a, b) => categoryOrder(a.category, "liability") - categoryOrder(b.category, "liability")), side: "liability"  as const },
              ]
            ).map(({ title, groups, side }) => (
              <View key={title}>
                <Text
                  style={{ fontSize: 18, fontWeight: "600", opacity: 0.85 }}
                >
                  {title}
                </Text>
                <View style={{ marginTop: 10 }}>
                  {groups.map((group) => (
                    <View key={group.category} style={{ marginBottom: 12 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          opacity: 0.5,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          marginBottom: 2,
                        }}
                      >
                        {toTitleCase(group.category)}
                      </Text>
                      {group.positions.map((position, index) => (
                        <View
                          key={position.id}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            paddingVertical: 10,
                            borderBottomWidth:
                              index === group.positions.length - 1 ? 0 : 1,
                            borderBottomColor: "rgba(33, 24, 14, 0.15)",
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                marginRight: 8,
                                backgroundColor: categoryColor(group.category, side, 0, 1),
                              }}
                            />
                            <Text style={{ fontSize: 15, opacity: 0.78 }}>
                              {position.name}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 15, opacity: 0.78 }}>
                            {position.value !== null
                              ? `$${position.value.toLocaleString()}`
                              : "—"}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
        </View>
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}
