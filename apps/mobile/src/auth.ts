import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE = __DEV__
  ? 'http://localhost:3000'
  : 'https://finance-clarityapi-production.up.railway.app';

const TOKEN_KEY = 'harbor_auth_token';
const GUEST_TOKEN_KEY = 'harbor_guest_session';
const GUEST_DATA_KEY = 'harbor_guest_data';

// ─── JWT token (real auth) ────────────────────────────────────────────────────

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ─── Guest session ────────────────────────────────────────────────────────────

export type GuestData = {
  positions: Array<{
    id: string;
    category: string;
    side: 'asset' | 'liability';
    label: string;
    value: number;
    createdAt: string;
  }>;
};

export async function isGuestSession(): Promise<boolean> {
  const realToken = await getToken();
  if (realToken) return false;
  const guestFlag = await AsyncStorage.getItem(GUEST_TOKEN_KEY);
  return guestFlag === 'true';
}

export async function saveGuestSession(): Promise<void> {
  await AsyncStorage.setItem(GUEST_TOKEN_KEY, 'true');
}

export async function clearGuestSession(): Promise<void> {
  await AsyncStorage.multiRemove([GUEST_TOKEN_KEY, GUEST_DATA_KEY]);
}

export async function getGuestData(): Promise<GuestData | null> {
  const raw = await AsyncStorage.getItem(GUEST_DATA_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GuestData;
  } catch {
    return null;
  }
}

export async function saveGuestData(data: GuestData): Promise<void> {
  await AsyncStorage.setItem(GUEST_DATA_KEY, JSON.stringify(data));
}

// ─── Guest chart data builder ─────────────────────────────────────────────────

export function buildGuestChartData(
  positions: GuestData['positions'],
): {
  netWorthData: { date: string; value: number }[];
  compositionData: GuestData['positions'];
  dataStartDate: string;
} {
  const today = new Date().toISOString().split('T')[0];
  const totalAssets = positions
    .filter(p => p.side === 'asset')
    .reduce((sum, p) => sum + p.value, 0);
  const totalLiabilities = positions
    .filter(p => p.side === 'liability')
    .reduce((sum, p) => sum + p.value, 0);
  const netWorth = totalAssets - totalLiabilities;

  const series = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().split('T')[0];
    return { date: dateStr, value: dateStr >= today ? netWorth : 0 };
  });

  return { netWorthData: series, compositionData: positions, dataStartDate: today };
}

// ─── OTP requests ─────────────────────────────────────────────────────────────

export async function requestOtp(email: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Failed to send code');
  }
}

export async function requestOtpPhone(phone: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/request-otp/phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Failed to send code');
  }
}

export async function verifyOtp(
  email: string,
  code: string,
): Promise<{ token: string; user: { id: string; email: string } }> {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Failed to verify code');
  }
  return res.json();
}

export async function verifyOtpPhone(
  phone: string,
  code: string,
): Promise<{ token: string; user: { id: string; email: string } }> {
  const res = await fetch(`${API_BASE}/auth/verify-otp/phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Failed to verify code');
  }
  return res.json();
}
