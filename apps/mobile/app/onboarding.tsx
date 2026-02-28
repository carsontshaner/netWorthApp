import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getToken } from '@/src/auth';
import { API_BASE } from '@/src/api';
import { CATEGORY_ORDER, categoryColor } from '@/src/theme';

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

type EntryState = {
  [key: string]: { value: string; skipped: boolean };
};

function makeKey(category: string, side: string) {
  return `${category}_${side}`;
}

function initState(): EntryState {
  const state: EntryState = {};
  for (const { category, side } of CATEGORY_ORDER) {
    state[makeKey(category, side)] = { value: '', skipped: false };
  }
  return state;
}

function isComplete(state: EntryState): boolean {
  return Object.values(state).every(e => e.skipped || e.value !== '');
}

const ASSETS = CATEGORY_ORDER.filter(e => e.side === 'asset');
const LIABILITIES = CATEGORY_ORDER.filter(e => e.side === 'liability');

export default function OnboardingScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<EntryState>(initState);
  const [startChoice, setStartChoice] = useState<'assets' | 'liabilities' | null>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function updateEntry(key: string, patch: Partial<EntryState[string]>) {
    setEntries(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  const completed = Object.values(entries).filter(e => e.skipped || e.value !== '').length;
  const total = CATEGORY_ORDER.length;

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const payload = CATEGORY_ORDER.flatMap(({ category, side }) => {
        const key = makeKey(category, side);
        const e = entries[key];
        const label = CATEGORY_LABELS[key] ?? category;
        if (e.skipped) return [{ category, side, label, value: 0 }];
        if (e.value !== '') return [{ category, side, label, value: parseFloat(e.value.replace(/,/g, '')) }];
        return [];
      });

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

  function renderCategoryRow(category: string, side: 'asset' | 'liability') {
    const key = makeKey(category, side);
    const entry = entries[key];
    const label = CATEGORY_LABELS[key] ?? category;
    const color = categoryColor(category, side, 0, 1);

    return (
      <View
        key={key}
        style={{
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(39,35,28,0.08)',
        }}
      >
        {/* Top row: dot + label + skip control */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
          <Text
            style={{
              flex: 1,
              marginLeft: 10,
              fontSize: 16,
              fontWeight: '400',
              color: '#27231C',
            }}
          >
            {label}
          </Text>

          {entry.skipped ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 12, color: 'rgba(39,35,28,0.40)' }}>Skipped</Text>
              <Pressable onPress={() => updateEntry(key, { skipped: false, value: '' })}>
                <Text style={{ fontSize: 12, color: 'rgba(39,35,28,0.55)', textDecorationLine: 'underline' }}>
                  undo
                </Text>
              </Pressable>
            </View>
          ) : entry.value === '' ? (
            <Pressable onPress={() => updateEntry(key, { skipped: true })}>
              <Text style={{ fontSize: 12, color: 'rgba(39,35,28,0.40)' }}>Skip</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Dollar input (hidden when skipped) */}
        {!entry.skipped && (
          <TextInput
            value={entry.value}
            onChangeText={v => updateEntry(key, { value: v })}
            keyboardType="numeric"
            placeholder="$0"
            placeholderTextColor="rgba(39,35,28,0.30)"
            onFocus={() => setFocusedKey(key)}
            onBlur={() => setFocusedKey(null)}
            style={{
              fontSize: 24,
              fontWeight: '300',
              color: '#27231C',
              borderBottomWidth: 1.5,
              borderBottomColor: focusedKey === key ? '#5B4A3A' : 'rgba(39,35,28,0.20)',
              paddingBottom: 4,
              marginTop: 8,
            }}
          />
        )}
      </View>
    );
  }

  function renderSection(
    items: ReadonlyArray<{ category: string; side: 'asset' | 'liability' }>,
    side: 'asset' | 'liability',
  ) {
    const title = side === 'asset' ? 'Assets' : 'Liabilities';
    const stripColor = side === 'asset' ? '#7FB3C8' : '#8B6347';

    return (
      <View key={side} style={{ marginBottom: 40 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '500',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: 'rgba(39,35,28,0.45)',
            marginBottom: 16,
          }}
        >
          {title}
        </Text>

        {/* Left border strip + content */}
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 3, borderRadius: 2, backgroundColor: stripColor }} />
          <View style={{ flex: 1, paddingLeft: 16 }}>
            {items.map(({ category, side: s }) => renderCategoryRow(category, s))}
          </View>
        </View>
      </View>
    );
  }

  const canSubmit = isComplete(entries) && !loading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F3E7D3' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Wordmark */}
          <Text
            style={{
              fontSize: 48,
              fontWeight: '300',
              color: '#27231C',
              letterSpacing: 5.5,
              textAlign: 'center',
              marginTop: 32,
              marginBottom: 32,
            }}
          >
            Harbor
          </Text>

          {/* Heading */}
          <Text
            style={{
              fontSize: 28,
              fontWeight: '300',
              color: '#27231C',
              marginBottom: 8,
            }}
          >
            Let's build your picture.
          </Text>

          {/* Subheading */}
          <Text
            style={{
              fontSize: 15,
              fontWeight: '300',
              color: 'rgba(39,35,28,0.60)',
              marginBottom: 40,
            }}
          >
            Start wherever feels right. You can always update these later.
          </Text>

          {/* Start choice cards */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 40 }}>
            <Pressable
              onPress={() => setStartChoice('assets')}
              style={{
                flex: 1,
                backgroundColor: 'rgba(167,214,207,0.25)',
                borderWidth: 1.5,
                borderColor: 'rgba(127,179,200,0.4)',
                borderRadius: 16,
                padding: 20,
                opacity: startChoice === 'liabilities' ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#27231C', marginBottom: 4 }}>
                Start with Assets
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '300', color: 'rgba(39,35,28,0.60)' }}>
                What you own
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setStartChoice('liabilities')}
              style={{
                flex: 1,
                backgroundColor: 'rgba(200,184,154,0.25)',
                borderWidth: 1.5,
                borderColor: 'rgba(139,99,71,0.3)',
                borderRadius: 16,
                padding: 20,
                opacity: startChoice === 'assets' ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#27231C', marginBottom: 4 }}>
                Start with Liabilities
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '300', color: 'rgba(39,35,28,0.60)' }}>
                What you owe
              </Text>
            </Pressable>
          </View>

          {/* Category sections — only shown after start choice */}
          {startChoice !== null && (
            <>
              {startChoice === 'assets' ? (
                <>
                  {renderSection(ASSETS, 'asset')}
                  {renderSection(LIABILITIES, 'liability')}
                </>
              ) : (
                <>
                  {renderSection(LIABILITIES, 'liability')}
                  {renderSection(ASSETS, 'asset')}
                </>
              )}

              {/* Progress hint */}
              <Text
                style={{
                  fontSize: 13,
                  color: 'rgba(39,35,28,0.50)',
                  textAlign: 'center',
                  marginBottom: 24,
                }}
              >
                {completed} of {total} categories complete
              </Text>

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
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#F3E7D3" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#F3E7D3' }}>
                    See my Net Worth
                  </Text>
                )}
              </Pressable>

              {error ? (
                <Text style={{ color: '#C0392B', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                  {error}
                </Text>
              ) : null}

              <Text
                style={{
                  fontSize: 12,
                  color: 'rgba(39,35,28,0.40)',
                  textAlign: 'center',
                  marginTop: 12,
                }}
              >
                You can update any of these later.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
