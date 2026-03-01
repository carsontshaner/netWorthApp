import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchComposition, API_BASE, type CompositionSummary } from "@/src/api";
import { getToken, isGuestSession, getGuestData } from "@/src/auth";
import BackButton from "@/components/BackButton";
import InfoButton from "@/components/InfoButton";
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

function formatForEdit(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function timeAgo(dateStr: string): string {
  const days = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days === 0) return 'Updated today';
  if (days < 30) return `Updated ${days}d ago`;
  const months = Math.floor(days / 30);
  return `Updated ${months}mo ago`;
}

export default function CompositionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<CompositionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groupsTop, setGroupsTop] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Record<string, string>>({});

  function onGroupsLayout(e: LayoutChangeEvent) {
    setGroupsTop(e.nativeEvent.layout.y);
  }

  function loadData() {
    setData(null);
    setError(null);
    fetchComposition()
      .then(setData)
      .catch((e) => setError(e?.message ?? "Unknown error"));
  }

  const loadDepth = useCallback(async () => {
    if (await isGuestSession()) {
      const guestData = await getGuestData();
      if (guestData && guestData.positions.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const groupMap = new Map<string, { category: string; total: number; positions: CompositionSummary['assets'][0]['positions'] }>();
        for (const pos of guestData.positions) {
          const key = `${pos.category}_${pos.side}`;
          if (!groupMap.has(key)) groupMap.set(key, { category: pos.category, total: 0, positions: [] });
          const g = groupMap.get(key)!;
          g.total += pos.value;
          g.positions.push({ id: pos.id, name: pos.label, value: pos.value, sourceType: 'manual', lastUpdated: today });
        }
        const assets: CompositionSummary['assets'] = [];
        const liabilities: CompositionSummary['liabilities'] = [];
        for (const [key, group] of groupMap) {
          if (key.endsWith('_asset')) assets.push(group);
          else liabilities.push(group);
        }
        const totalAssets = guestData.positions.filter(p => p.side === 'asset').reduce((s, p) => s + p.value, 0);
        const totalLiabilities = guestData.positions.filter(p => p.side === 'liability').reduce((s, p) => s + p.value, 0);
        setData({ assets, liabilities, totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities });
      }
      return;
    }
    loadData();
  }, []);

  // Fetch fresh data on mount
  useEffect(() => {
    loadDepth();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDepth();
    }, [])
  );

  function initEditState(d: CompositionSummary) {
    const vals: Record<string, string> = {};
    for (const g of [...d.assets, ...d.liabilities]) {
      for (const p of g.positions) {
        vals[p.id] = p.value !== null ? formatForEdit(p.value) : '';
      }
    }
    setEditValues(vals);
  }

  function handleEditToggle() {
    if (!isEditing && data) {
      initEditState(data);
    }
    setIsEditing(v => !v);
  }

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    setSaveError({});
    let anyError = false;
    try {
      const token = await getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      for (const g of [...data.assets, ...data.liabilities]) {
        for (const p of g.positions) {
          const newVal = parseFloat((editValues[p.id] ?? '').replace(/,/g, ''));
          if (!isNaN(newVal) && newVal !== (p.value ?? 0)) {
            console.log('[handleSave] PATCH position', p.id, 'value', newVal);
            try {
              const res = await fetch(`${API_BASE}/positions/${p.id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ value: newVal }),
              });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
            } catch (err) {
              console.error('[handleSave] PATCH error for position', p.id, err);
              setSaveError(prev => ({ ...prev, [p.id]: "Couldn't save — please try again." }));
              anyError = true;
            }
          }
        }
      }

      if (!anyError) {
        setIsEditing(false);
        setSaveError({});
        loadData();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(posId: string) {
    try {
      const token = await getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`${API_BASE}/positions/${posId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ archived: true }),
      });
      setIsEditing(false);
      setData(null);
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to archive. Please try again.');
    }
  }

  async function handleDelete(posId: string) {
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`${API_BASE}/positions/${posId}`, { method: 'DELETE', headers });
      setIsEditing(false);
      setData(null);
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to delete. Please try again.');
    }
  }

  function confirmDeleteEverything(posId: string) {
    Alert.alert(
      'Are you sure?',
      'This will permanently delete this entry and all its historical data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete permanently', style: 'destructive', onPress: () => handleDelete(posId) },
      ]
    );
  }

  function promptDelete(posId: string, posName: string) {
    Alert.alert(
      'Delete entry',
      'How would you like to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete + keep history', onPress: () => handleArchive(posId) },
        { text: 'Delete everything', style: 'destructive', onPress: () => confirmDeleteEverything(posId) },
      ]
    );
  }

  function renderPositionRow(
    position: CompositionSummary['assets'][0]['positions'][0],
    side: 'asset' | 'liability',
    category: string,
    isLast: boolean,
  ) {
    const color = categoryColor(category, side, 0, 1);

    return (
      <View
        key={position.id}
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingVertical: 10,
          borderBottomWidth: isLast ? 0 : 1,
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
              backgroundColor: color,
            }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, opacity: 0.78 }}>
              {position.name}
            </Text>
            {position.lastUpdated && (
              <Text style={{ fontSize: 11, color: 'rgba(39,35,28,0.40)', marginTop: 2 }}>
                {timeAgo(position.lastUpdated)}
              </Text>
            )}
          </View>
        </View>
        {isEditing ? (
          <View style={{ alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, color: '#27231C', marginRight: 2 }}>$</Text>
                <TextInput
                  value={editValues[position.id] ?? ''}
                  onChangeText={raw => {
                    const clean = raw.replace(/[^0-9.]/g, '');
                    setEditValues(prev => ({ ...prev, [position.id]: clean }));
                  }}
                  keyboardType="decimal-pad"
                  style={{
                    fontSize: 15,
                    color: '#27231C',
                    borderBottomWidth: 1,
                    borderBottomColor: '#5B4A3A',
                    minWidth: 80,
                    textAlign: 'right',
                    paddingBottom: 2,
                  }}
                />
              </View>
              <Pressable
                onPress={() => promptDelete(position.id, position.name)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ fontSize: 16, color: 'rgba(39,35,28,0.35)' }}>✕</Text>
              </Pressable>
            </View>
            {saveError[position.id] ? (
              <Text style={{ fontSize: 13, fontWeight: '300', color: '#C0392B', marginTop: 4 }}>
                {saveError[position.id]}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text style={{ fontSize: 15, opacity: 0.78 }}>
            {position.value !== null ? `$${position.value.toLocaleString()}` : "—"}
          </Text>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3E7D3" }}>
      {/* Back button — top left */}
      <View style={{ position: 'absolute', top: insets.top + 12, left: 20, zIndex: 10 }}>
        <BackButton label="Chart" />
      </View>
      {/* Pencil edit icon — top right */}
      <Pressable
        onPress={handleEditToggle}
        style={{ position: 'absolute', top: insets.top + 12, right: 20, zIndex: 10, padding: 8 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {isEditing ? (
          <Text style={{ fontSize: 15, color: '#5B4A3A' }}>Cancel</Text>
        ) : (
          <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
            <Path
              d="M13.5 2.5 L17.5 6.5 L6.5 17.5 L2.5 17.5 L2.5 13.5 Z"
              stroke="rgba(39,35,28,0.60)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Path
              d="M13.5 2.5 L17.5 6.5"
              stroke="rgba(39,35,28,0.60)"
              strokeWidth={1.5}
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M5.5 14.5 L5.5 14.5"
              stroke="rgba(39,35,28,0.60)"
              strokeWidth={1.5}
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M12 4 L16 8"
              stroke="rgba(39,35,28,0.60)"
              strokeWidth={1}
              strokeLinecap="round"
              fill="none"
              opacity={0.4}
            />
          </Svg>
        )}
      </Pressable>

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
          contentContainerStyle={{ paddingBottom: isEditing ? 100 : 40 }}
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
                    <Text style={{ fontSize: 18, fontWeight: "600", opacity: 0.85 }}>
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
                          {group.positions.map((position, index) =>
                            renderPositionRow(position, side, group.category, index === group.positions.length - 1)
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                ))}

                {/* Update my picture button */}
                {!isEditing && (
                  <Pressable
                    onPress={() => router.push('/onboarding')}
                    style={{
                      marginTop: 32,
                      marginBottom: 32,
                      padding: 18,
                      borderRadius: 14,
                      backgroundColor: 'rgba(91,74,58,0.08)',
                      borderWidth: 1.5,
                      borderColor: 'rgba(91,74,58,0.20)',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '500', color: '#5B4A3A', letterSpacing: 0.2 }}>
                      Update my picture →
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Save button — fixed above safe area when editing */}
        {isEditing && (
          <View
            style={{
              position: 'absolute',
              bottom: insets.bottom + 16,
              left: 20,
              right: 20,
            }}
          >
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={{
                backgroundColor: '#5B4A3A',
                borderRadius: 14,
                height: 56,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? (
                <ActivityIndicator color="#F3E7D3" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#F3E7D3' }}>
                  Save changes
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {!isEditing && (
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
        )}
      </View>
    </SafeAreaView>
  );
}
