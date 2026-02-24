import React from "react";
import { SafeAreaView, Text, View } from "react-native";

const GROUPS = [
  {
    title: "Assets",
    rows: ["Cash", "Investments", "Home equity"],
  },
  {
    title: "Liabilities",
    rows: ["Credit cards", "Mortgage", "Student loans"],
  },
] as const;

export default function CompositionScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3E7D3" }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
        <Text style={{ fontSize: 14, opacity: 0.7 }}>Balance sheet</Text>
        <Text style={{ marginTop: 8, fontSize: 34, fontWeight: "600" }}>
          Composition
        </Text>

        <View style={{ marginTop: 24, gap: 20 }}>
          {GROUPS.map((group) => (
            <View key={group.title}>
              <Text style={{ fontSize: 18, fontWeight: "600", opacity: 0.85 }}>
                {group.title}
              </Text>
              <View style={{ marginTop: 10 }}>
                {group.rows.map((row, index) => (
                  <View
                    key={row}
                    style={{
                      paddingVertical: 10,
                      borderBottomWidth: index === group.rows.length - 1 ? 0 : 1,
                      borderBottomColor: "rgba(33, 24, 14, 0.15)",
                    }}
                  >
                    <Text style={{ fontSize: 15, opacity: 0.78 }}>{row}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
