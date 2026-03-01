import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getToken, isGuestSession, getGuestData, saveGuestData } from '@/src/auth';
import { API_BASE } from '@/src/api';
import { CATEGORY_ORDER, categoryColor, harborWordmark } from '@/src/theme';
import BackButton from '@/components/BackButton';

function formatCurrencyInput(raw: string): string {
  const clean = raw.replace(/[^0-9.]/g, '');
  const parts = clean.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (parts.length > 1) {
    return parts[0] + '.' + parts[1].slice(0, 2);
  }
  return parts[0];
}

const CATEGORY_LABELS: Record<string, string> = {
  cash_asset:               'Cash & Checking',
  brokerage_asset:          'Brokerage Accounts',
  retirement_asset:         'Retirement Accounts',
  real_estate_asset:        'Real Estate',
  vehicle_asset:            'Vehicles',
  business_ownership_asset: 'Business Ownership',
  other_asset:              'Other Assets',
  credit_card_liability:    'Credit Cards',
  personal_loan_liability:  'Personal Loans',
  taxes_owed_liability:     'Taxes Owed',
  mortgage_liability:       'Mortgage',
  student_loan_liability:   'Student Loans',
  auto_loan_liability:      'Auto Loans',
  other_liability:          'Other Liabilities',
};

type Entry = {
  id: string;
  side: 'asset' | 'liability';
  category: string | null;
  value: string;
  label: string;
  skipped: boolean;
};

const ASSET_CATEGORIES = CATEGORY_ORDER.filter(e => e.side === 'asset');
const LIABILITY_CATEGORIES = CATEGORY_ORDER.filter(e => e.side === 'liability');

function newEntry(side: 'asset' | 'liability'): Entry {
  return {
    id: String(Date.now() + Math.random()),
    side,
    category: null,
    value: '',
    label: '',
    skipped: false,
  };
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeSide, setActiveSide] = useState<'assets' | 'liabilities' | null>(null);
  const [assetEntries, setAssetEntries] = useState<Entry[]>([]);
  const [liabilityEntries, setLiabilityEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // On mount: load existing positions into state for update mode
  useEffect(() => {
    async function loadExisting() {
      if (await isGuestSession()) {
        const data = await getGuestData();
        if (!data?.positions?.length) return;
        const assets = data.positions
          .filter(p => p.side === 'asset')
          .map(p => ({
            id: p.id,
            side: 'asset' as const,
            category: p.category,
            value: formatCurrencyInput(String(p.value)),
            label: p.label,
            skipped: false,
          }));
        const liabilities = data.positions
          .filter(p => p.side === 'liability')
          .map(p => ({
            id: p.id,
            side: 'liability' as const,
            category: p.category,
            value: formatCurrencyInput(String(p.value)),
            label: p.label,
            skipped: false,
          }));
        if (assets.length > 0) setAssetEntries(assets);
        if (liabilities.length > 0) setLiabilityEntries(liabilities);
      } else {
        const token = await getToken();
        if (!token) return;
        try {
          const res = await fetch(`${API_BASE}/composition/summary`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return;
          const data = await res.json();
          const assets: Entry[] = (data.assets ?? []).flatMap((group: any) =>
            (group.positions ?? []).map((p: any) => ({
              id: p.id,
              side: 'asset' as const,
              category: group.category,
              value: p.value != null ? formatCurrencyInput(String(p.value)) : '',
              label: p.name ?? '',
              skipped: false,
            }))
          );
          const liabilities: Entry[] = (data.liabilities ?? []).flatMap((group: any) =>
            (group.positions ?? []).map((p: any) => ({
              id: p.id,
              side: 'liability' as const,
              category: group.category,
              value: p.value != null ? formatCurrencyInput(String(p.value)) : '',
              label: p.name ?? '',
              skipped: false,
            }))
          );
          if (assets.length > 0) setAssetEntries(assets);
          if (liabilities.length > 0) setLiabilityEntries(liabilities);
        } catch {
          // silently fail — user sees an empty form
        }
      }
    }
    loadExisting();
  }, []);

  // Initialize with one empty entry when a side is first selected
  useEffect(() => {
    if (!activeSide) return;
    if (activeSide === 'assets') {
      setAssetEntries(prev => {
        if (prev.length === 0) return [newEntry('asset')];
        const last = prev[prev.length - 1];
        if (last.category !== null && last.value !== '') return [...prev, newEntry('asset')];
        return prev;
      });
    } else {
      setLiabilityEntries(prev => {
        if (prev.length === 0) return [newEntry('liability')];
        const last = prev[prev.length - 1];
        if (last.category !== null && last.value !== '') return [...prev, newEntry('liability')];
        return prev;
      });
    }
  }, [activeSide]);

  function getEntries(): Entry[] {
    return activeSide === 'assets' ? assetEntries : liabilityEntries;
  }

  function setEntries(updater: (prev: Entry[]) => Entry[]) {
    if (activeSide === 'assets') {
      setAssetEntries(updater);
    } else {
      setLiabilityEntries(updater);
    }
  }

  function updateEntry(id: string, patch: Partial<Entry>) {
    setEntries(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...patch } : e);
      // Auto-append new empty row when last entry becomes filled
      const last = updated[updated.length - 1];
      if (last && last.id === id && last.category !== null && last.value !== '') {
        return [...updated, newEntry(last.side)];
      }
      return updated;
    });
  }

  function removeEntry(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function openCategoryModal(entryId: string) {
    setEditingEntryId(entryId);
    setModalVisible(true);
  }

  function selectCategory(category: string) {
    if (editingEntryId) {
      updateEntry(editingEntryId, { category });
    }
    setModalVisible(false);
    setEditingEntryId(null);
  }

  const currentSide = activeSide === 'assets' ? 'asset'
    : activeSide === 'liabilities' ? 'liability'
    : null;
  const currentEntries = currentSide === 'asset' ? assetEntries : currentSide === 'liability' ? liabilityEntries : [];
  const currentCategories = currentSide === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;

  // All filled entries across both sides, using each entry's own side value
  const allEntries = [...assetEntries, ...liabilityEntries];
  const filledEntries = allEntries.filter(e => e.category !== null && e.value !== '');
  const canSubmit = filledEntries.length > 0 && !loading;

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const payload = filledEntries.map(e => ({
        category: e.category!,
        side: e.side,
        label: e.label || (CATEGORY_LABELS[`${e.category}_${e.side}`] ?? e.category!),
        value: parseFloat(e.value.replace(/,/g, '')),
      }));

      if (await isGuestSession()) {
        const existingData = await getGuestData();
        const existingById = new Map((existingData?.positions ?? []).map(p => [p.id, p]));
        const positions = filledEntries.map(e => ({
          id: e.id,
          category: e.category!,
          side: e.side,
          label: e.label || (CATEGORY_LABELS[`${e.category}_${e.side}`] ?? e.category!),
          value: parseFloat(e.value.replace(/,/g, '')),
          createdAt: existingById.get(e.id)?.createdAt ?? new Date().toISOString(),
        }));
        await saveGuestData({ positions });
        router.replace('/(tabs)');
        return;
      }

      const token = await getToken();
      const res = await fetch(`${API_BASE}/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to submit');
      router.replace('/(tabs)');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function renderEntryRow(entry: Entry) {
    const color = entry.category
      ? categoryColor(entry.category, entry.side, 0, 1)
      : 'rgba(39,35,28,0.20)';
    const catLabel = entry.category
      ? (CATEGORY_LABELS[`${entry.category}_${entry.side}`] ?? entry.category)
      : null;
    const placeholder = currentSide === 'asset' ? 'Add an asset' : 'Add a liability';
    const showRemove = currentEntries.length > 1;

    return (
      <View
        key={entry.id}
        style={{
          backgroundColor: 'rgba(255,255,255,0.5)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
        }}
      >
        {/* Row 1: Category selector */}
        <Pressable
          onPress={() => openCategoryModal(entry.id)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {entry.category && (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 8 }} />
            )}
            <Text style={{ fontSize: 16, color: catLabel ? '#27231C' : 'rgba(39,35,28,0.40)' }}>
              {catLabel ?? placeholder}
            </Text>
          </View>
          <Text style={{ fontSize: 16, color: 'rgba(39,35,28,0.40)' }}>⌄</Text>
        </Pressable>

        {/* Rows 2–3: Value + Label (shown after category selected) */}
        {entry.category !== null && (
          <>
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 11, color: 'rgba(39,35,28,0.45)', marginBottom: 2 }}>Value</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Text style={{ fontSize: 20, fontWeight: '300', color: '#27231C', marginRight: 4 }}>$</Text>
                <TextInput
                  value={entry.value}
                  onChangeText={(raw) => {
                    const formatted = formatCurrencyInput(raw);
                    updateEntry(entry.id, { value: formatted });
                  }}
                  keyboardType="decimal-pad"
                  placeholderTextColor="rgba(39,35,28,0.30)"
                  style={{
                    flex: 1,
                    fontSize: 20,
                    fontWeight: '300',
                    color: '#27231C',
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(39,35,28,0.15)',
                  }}
                />
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', gap: 4, marginBottom: 2 }}>
                <Text style={{ fontSize: 11, color: 'rgba(39,35,28,0.45)' }}>Label</Text>
                <Text style={{ fontSize: 11, color: 'rgba(39,35,28,0.30)' }}>(optional)</Text>
              </View>
              <TextInput
                value={entry.label}
                onChangeText={v => updateEntry(entry.id, { label: v })}
                placeholder="e.g. 'Toyota Camry'"
                placeholderTextColor="rgba(39,35,28,0.30)"
                style={{
                  fontSize: 14,
                  color: 'rgba(39,35,28,0.60)',
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(39,35,28,0.10)',
                  paddingBottom: 4,
                }}
              />
              <Text style={{ fontSize: 11, color: 'rgba(39,35,28,0.35)', marginTop: 4 }}>
                Give this entry a name (e.g. 'Primary home', 'Chase checking')
              </Text>
            </View>
          </>
        )}

        {/* Row 4: Remove */}
        {showRemove && (
          <Pressable onPress={() => removeEntry(entry.id)} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
            <Text style={{ fontSize: 12, color: 'rgba(39,35,28,0.35)' }}>Remove</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F3E7D3' }}>
      {/* Back button — top left */}
      <View style={{ position: 'absolute', top: insets.top + 12, left: 20, zIndex: 10 }}>
        <BackButton label="Chart" onPress={() => router.replace('/(tabs)')} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Wordmark */}
          <Text style={{ ...harborWordmark, textAlign: 'center', marginTop: 32, marginBottom: 32 }}>
            Harbor
          </Text>

          {/* Heading */}
          <Text style={{ fontSize: 28, fontWeight: '300', color: '#27231C', marginBottom: 8 }}>
            Let's build your picture.
          </Text>

          {/* Subheading */}
          <Text style={{ fontSize: 15, fontWeight: '300', color: 'rgba(39,35,28,0.60)', marginBottom: 32 }}>
            Start wherever feels right. You can always update these later.
          </Text>

          {/* Toggle cards — always visible */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
            <Pressable
              onPress={() => setActiveSide('assets')}
              style={{
                flex: 1,
                backgroundColor: 'rgba(167,214,207,0.25)',
                borderWidth: activeSide === 'assets' ? 2 : 1.5,
                borderColor: activeSide === 'assets' ? '#7FB3C8' : 'rgba(127,179,200,0.4)',
                borderRadius: 16,
                padding: 20,
                opacity: activeSide === 'liabilities' ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#27231C', marginBottom: 4 }}>
                Add your Assets
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '300', color: 'rgba(39,35,28,0.60)' }}>
                What you own
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveSide('liabilities')}
              style={{
                flex: 1,
                backgroundColor: 'rgba(200,184,154,0.25)',
                borderWidth: activeSide === 'liabilities' ? 2 : 1.5,
                borderColor: activeSide === 'liabilities' ? '#8B6347' : 'rgba(139,99,71,0.3)',
                borderRadius: 16,
                padding: 20,
                opacity: activeSide === 'assets' ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#27231C', marginBottom: 4 }}>
                Add your Liabilities
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '300', color: 'rgba(39,35,28,0.60)' }}>
                What you owe
              </Text>
            </Pressable>
          </View>

          {/* Entry rows — only for active side */}
          {activeSide !== null && (
            <>
              {currentEntries.map(entry => renderEntryRow(entry))}

              {/* Submit button */}
              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={{
                  width: '100%',
                  height: 56,
                  backgroundColor: '#5B4A3A',
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: canSubmit ? 1 : 0.4,
                  marginTop: 8,
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#F3E7D3" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#F3E7D3' }}>
                    Update my picture
                  </Text>
                )}
              </Pressable>

              {error ? (
                <Text style={{ color: '#C0392B', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                  {error}
                </Text>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category selector modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
          onPress={() => setModalVisible(false)}
        />
        <View
          style={{
            backgroundColor: '#F3E7D3',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: insets.bottom + 16,
            maxHeight: '60%',
          }}
        >
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(39,35,28,0.10)' }}>
            <Text style={{ fontSize: 16, fontWeight: '500', color: '#27231C', textAlign: 'center' }}>
              {currentSide === 'asset' ? 'Select Asset Type' : 'Select Liability Type'}
            </Text>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {currentCategories.map(({ category, side }) => {
              const label = CATEGORY_LABELS[`${category}_${side}`] ?? category;
              const color = categoryColor(category, side, 0, 1);
              return (
                <Pressable
                  key={`${category}_${side}`}
                  onPress={() => selectCategory(category)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(39,35,28,0.06)',
                  }}
                >
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginRight: 12 }} />
                  <Text style={{ fontSize: 16, color: '#27231C' }}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
